"""Template Generation Service - Generates Word document from structure"""
from typing import Dict, Any
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
from io import BytesIO
from app.database.client import db_client


class TemplateGenerationService:
    def __init__(self):
        pass

    def generate_template(self, proposal_id: str) -> BytesIO:
        """
        Generate Word template from structure and workplan analysis.

        Args:
            proposal_id: Proposal code (PROP-YYYYMMDD-XXXX)

        Returns:
            BytesIO: Word document as bytes
        """
        # Load proposal
        proposal = db_client.get_item_sync(
            pk=f"PROPOSAL#{proposal_id}", sk="METADATA"
        )

        if not proposal:
            raise Exception(f"Proposal {proposal_id} not found")

        # Get structure workplan analysis
        structure_data = proposal.get("structure_workplan_analysis", {})
        if not structure_data:
            raise Exception("Structure and workplan analysis not found")
        
        # Unwrap if nested (structure_workplan_analysis.structure_workplan_analysis)
        structure_analysis = structure_data.get("structure_workplan_analysis", structure_data)

        # Get RFP analysis for context
        rfp_analysis = proposal.get("rfp_analysis", {})
        
        # Create Word document
        doc = Document()
        
        # Add title
        title = doc.add_heading(proposal.get("title", "Proposal Template"), 0)
        title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER
        
        # Add metadata
        doc.add_paragraph(f"Donor: {rfp_analysis.get('donor_name', 'N/A')}")
        doc.add_paragraph(f"Deadline: {rfp_analysis.get('submission_deadline', 'N/A')}")
        doc.add_paragraph()
        
        # Add narrative overview
        if structure_analysis.get("narrative_overview"):
            doc.add_heading("Overview", 1)
            doc.add_paragraph(structure_analysis["narrative_overview"])
            doc.add_paragraph()
        
        # Add mandatory sections
        mandatory = structure_analysis.get("proposal_mandatory", [])
        if mandatory:
            doc.add_heading("Mandatory Sections", 1)
            for section in mandatory:
                self._add_section(doc, section, is_mandatory=True)
        
        # Add outline sections
        outline = structure_analysis.get("proposal_outline", [])
        if outline:
            doc.add_heading("Additional Sections", 1)
            for section in outline:
                self._add_section(doc, section, is_mandatory=False)
        
        # Add HCD notes if available
        hcd_notes = structure_analysis.get("hcd_notes", [])
        if hcd_notes:
            doc.add_page_break()
            doc.add_heading("Design Notes", 1)
            for note in hcd_notes:
                p = doc.add_paragraph(note.get("note", ""), style='List Bullet')
        
        # Save to BytesIO
        buffer = BytesIO()
        doc.save(buffer)
        buffer.seek(0)
        
        return buffer

    def _add_section(self, doc: Document, section: Dict[str, Any], is_mandatory: bool = False):
        """Add a section to the document"""
        # Section title
        heading = doc.add_heading(section.get("section_title", ""), 2)
        if is_mandatory:
            run = heading.runs[0]
            run.font.color.rgb = RGBColor(0, 166, 62)  # Green for mandatory
        
        # Word count
        if section.get("recommended_word_count"):
            p = doc.add_paragraph()
            run = p.add_run(f"Recommended length: {section['recommended_word_count']}")
            run.italic = True
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(113, 113, 130)
        
        # Purpose
        if section.get("purpose"):
            doc.add_paragraph(f"Purpose: {section['purpose']}", style='Intense Quote')
        
        # Content guidance
        if section.get("content_guidance"):
            doc.add_heading("What to write:", 3)
            doc.add_paragraph(section["content_guidance"])
        
        # Guiding questions
        questions = section.get("guiding_questions", [])
        if questions:
            doc.add_heading("Guiding questions:", 3)
            for q in questions:
                doc.add_paragraph(q, style='List Bullet')
        
        # Add space for writing
        doc.add_paragraph()
        doc.add_paragraph("[Write your content here]", style='Intense Quote')
        doc.add_paragraph()
        doc.add_paragraph()
