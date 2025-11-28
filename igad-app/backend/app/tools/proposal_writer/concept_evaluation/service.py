"""
Simple Concept Analyzer - Analyzes Initial Concept using text or files
"""

import json
import os
from typing import Any, Dict
import boto3
from boto3.dynamodb.conditions import Attr
from PyPDF2 import PdfReader
from io import BytesIO

from app.database.client import db_client
from app.shared.ai.bedrock_service import BedrockService


class SimpleConceptAnalyzer:
    def __init__(self):
        self.s3 = boto3.client('s3')
        self.bucket = os.environ.get('PROPOSALS_BUCKET')
        if not self.bucket:
            raise Exception("PROPOSALS_BUCKET environment variable not set")
        self.bedrock = BedrockService()
        
        self.dynamodb = boto3.resource('dynamodb')
        self.table_name = os.environ.get('TABLE_NAME', 'igad-testing-main-table')
    
    def analyze_concept(self, proposal_id: str, rfp_analysis: Dict) -> Dict[str, Any]:
        """Analyze Initial Concept (synchronous for Lambda worker)"""
        try:
            # 1. Get proposal from DynamoDB
            print(f"📋 Getting proposal: {proposal_id}")
            proposal = db_client.get_item_sync(
                pk=f"PROPOSAL#{proposal_id}",
                sk="METADATA"
            )
            
            if not proposal:
                raise Exception(f"Proposal {proposal_id} not found")
            
            proposal_code = proposal.get("proposalCode")
            if not proposal_code:
                raise Exception("Proposal code not found")
            
            # 2. Get concept text or files from S3
            print(f"Getting concept for proposal: {proposal_code}")
            concept_folder = f"{proposal_code}/documents/initial_concept/"
            
            concept_text = None
            
            # Try to get concept_text.txt first
            try:
                text_key = f"{concept_folder}concept_text.txt"
                print(f"Trying to get concept text: {text_key}")
                obj = self.s3.get_object(Bucket=self.bucket, Key=text_key)
                concept_text = obj['Body'].read().decode('utf-8')
                print(f"✅ Found concept text: {len(concept_text)} characters")
            except Exception as e:
                print(f"⚠️ No concept_text.txt found: {str(e)}")
            
            # If no text, try to extract from files
            if not concept_text:
                print("Looking for concept files...")
                response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=concept_folder)
                
                if 'Contents' in response and len(response['Contents']) > 0:
                    # Find first PDF/DOC/DOCX file
                    concept_file = None
                    for obj in response['Contents']:
                        key = obj['Key']
                        if key.lower().endswith(('.pdf', '.doc', '.docx')) and not key.endswith('/'):
                            concept_file = key
                            break
                    
                    if concept_file:
                        print(f"Extracting text from: {concept_file}")
                        concept_text = self.extract_text_from_file(concept_file)
                    else:
                        raise Exception("No concept files found (PDF/DOC/DOCX)")
                else:
                    raise Exception("No concept content found. Please add concept text or upload a file.")
            
            if not concept_text or len(concept_text) < 50:
                raise Exception("Concept text is too short or empty")
            
            print(f"Concept text ready: {len(concept_text)} characters")
            
            # 3. Get prompt from DynamoDB
            print("📝 Loading prompt from DynamoDB...")
            prompt_parts = self.get_prompt_from_dynamodb()
            
            if not prompt_parts:
                raise Exception("No active prompt found for Initial Concept analysis")
            
            print("✅ Using DynamoDB prompt")
            
            # 4. Prepare prompts with context
            # Handle long concept documents intelligently
            max_chars = 100000  # Increased from 8000 to 100000
            
            if len(concept_text) > max_chars:
                print(f"⚠️ Concept text is long ({len(concept_text)} chars), using intelligent truncation...")
                
                # Strategy: Keep beginning (context) and end (conclusion)
                # This preserves both problem statement and proposed solutions
                chars_to_keep = max_chars - 200  # Reserve 200 chars for truncation notice
                beginning_chars = int(chars_to_keep * 0.6)  # 60% from beginning
                ending_chars = int(chars_to_keep * 0.4)     # 40% from end
                
                beginning = concept_text[:beginning_chars]
                ending = concept_text[-ending_chars:]
                
                truncated_concept = (
                    f"{beginning}\n\n"
                    f"[... Middle section truncated - total document: {len(concept_text)} characters ...]\n\n"
                    f"{ending}"
                )
                
                print(f"📏 Kept {beginning_chars} chars from beginning + {ending_chars} chars from end = {len(truncated_concept)} total")
            else:
                truncated_concept = concept_text
                print(f"📄 Concept text within limit: {len(concept_text)} characters")
            
            # Inject rfp_analysis and concept_text into user prompt
            user_prompt = prompt_parts['user_prompt']
            user_prompt = user_prompt.replace("{rfp_analysis.summary}", json.dumps(rfp_analysis.get("summary", {}), indent=2))
            user_prompt = user_prompt.replace("{rfp_analysis.extracted_data}", json.dumps(rfp_analysis.get("extracted_data", {}), indent=2))
            user_prompt = user_prompt.replace("{{initial_concept}}", truncated_concept)
            
            # Combine with output format
            final_user_prompt = f"{user_prompt}\n\n{prompt_parts['output_format']}"
            
            # 5. Call Bedrock
            print("📡 Sending to Bedrock for concept analysis...")
            import time
            start_time = time.time()
            
            ai_response = self.bedrock.invoke_claude(
                system_prompt=prompt_parts['system_prompt'],
                user_prompt=final_user_prompt,
                max_tokens=15000,
                temperature=0.5
            )
            
            elapsed = time.time() - start_time
            print(f"⏱️ Bedrock response time: {elapsed:.2f} seconds")
            
            # 6. Parse response
            print("Parsing AI response...")
            result = self.parse_response(ai_response)
            
            print("✅ Concept analysis completed successfully")
            
            return {
                "concept_analysis": result,
                "status": "completed"
            }
            
        except Exception as e:
            print(f"❌ Concept analysis error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Concept analysis failed: {str(e)}")
    
    def extract_text_from_file(self, s3_key: str) -> str:
        """Extract text from PDF/DOC/DOCX file"""
        try:
            obj = self.s3.get_object(Bucket=self.bucket, Key=s3_key)
            file_bytes = obj['Body'].read()
            
            if s3_key.lower().endswith('.pdf'):
                return self.extract_text_from_pdf(file_bytes)
            elif s3_key.lower().endswith(('.doc', '.docx')):
                # For now, just return a message - full DOC/DOCX support requires python-docx
                return "[Document file uploaded - text extraction not yet implemented for DOC/DOCX]"
            else:
                raise Exception(f"Unsupported file type: {s3_key}")
                
        except Exception as e:
            raise Exception(f"File text extraction failed: {str(e)}")
    
    def extract_text_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes"""
        try:
            pdf_file = BytesIO(pdf_bytes)
            reader = PdfReader(pdf_file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise Exception(f"PDF text extraction failed: {str(e)}")
    
    def get_prompt_from_dynamodb(self) -> Dict[str, str]:
        """Get prompt from DynamoDB for Initial Concept analysis"""
        try:
            print("🔍 Querying DynamoDB for concept prompt...")
            table = self.dynamodb.Table(self.table_name)
            
            response = table.scan(
                FilterExpression=
                    Attr("is_active").eq(True) &
                    Attr("section").eq("proposal_writer") &
                    Attr("sub_section").eq("step-1") &
                    Attr("categories").contains("Initial Concept")
            )
            
            items = response.get("Items", [])
            
            if not items:
                print("⚠️ No active prompts found for Initial Concept")
                return None
            
            prompt_item = items[0]
            print(f"✅ Found prompt: {prompt_item.get('name', 'Unnamed')}")
            
            system_prompt = prompt_item.get("system_prompt", "")
            user_prompt = prompt_item.get("user_prompt_template", "")
            output_format = prompt_item.get("output_format", "")
            
            print(f"📝 Prompt parts loaded:")
            print(f"   - system_prompt: {len(system_prompt)} chars")
            print(f"   - user_prompt_template: {len(user_prompt)} chars")
            print(f"   - output_format: {len(output_format)} chars")
            
            return {
                'system_prompt': system_prompt,
                'user_prompt': user_prompt,
                'output_format': output_format
            }
            
        except Exception as e:
            print(f"❌ Error loading prompt from DynamoDB: {str(e)}")
            return None
    
    def parse_response(self, response: str) -> Dict[str, Any]:
        """Parse AI response into structured format"""
        try:
            response = response.strip()
            
            import re
            
            # Try to find JSON code block
            json_match = re.search(r'```json\s*(\{.*\})\s*```', response, re.DOTALL)
            if json_match:
                print("📦 Found JSON in code block")
                response = json_match.group(1)
            else:
                # Try to find JSON object directly
                json_match = re.search(r'\{.*\}', response, re.DOTALL)
                if json_match:
                    print("📦 Found JSON object in response")
                    response = json_match.group(0)
                else:
                    # Clean markdown markers
                    if response.startswith('```json'):
                        response = response[7:]
                    if response.startswith('```'):
                        response = response[3:]
                    if response.endswith('```'):
                        response = response[:-3]
            
            response = response.strip()
            
            parsed = json.loads(response)
            print("✅ Response parsed successfully")
            return parsed
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {str(e)}")
            return {
                "raw_response": response,
                "parse_error": str(e)
            }
