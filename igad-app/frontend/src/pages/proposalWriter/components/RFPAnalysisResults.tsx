import React from 'react';
import { CheckCircle, Calendar, DollarSign, FileText, MapPin, Target, Users } from 'lucide-react';

interface RFPAnalysisSummary {
  title: string;
  donor: string;
  deadline: string;
  budget_range: string;
  key_focus: string;
}

interface RFPAnalysisExtractedData {
  geographic_scope: string[];
  target_beneficiaries: string;
  deliverables: string[];
  mandatory_requirements: string[];
  evaluation_criteria: string;
}

interface RFPAnalysis {
  summary: RFPAnalysisSummary;
  extracted_data: RFPAnalysisExtractedData;
}

interface RFPAnalysisResultsProps {
  analysis: RFPAnalysis;
}

const RFPAnalysisResults: React.FC<RFPAnalysisResultsProps> = ({ analysis }) => {
  const { summary, extracted_data } = analysis;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <h3 className="text-xl font-semibold text-gray-900">
          RFP Analysis Complete
        </h3>
      </div>

      {/* Summary Section */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 space-y-4">
        <h4 className="font-semibold text-gray-900 text-lg mb-4">
          📋 Summary
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-700">Title</div>
              <div className="text-sm text-gray-900 mt-1">{summary.title}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-700">Donor</div>
              <div className="text-sm text-gray-900 mt-1">{summary.donor}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-700">Deadline</div>
              <div className="text-sm text-gray-900 mt-1 font-semibold text-red-600">
                {summary.deadline}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-gray-700">Budget Range</div>
              <div className="text-sm text-gray-900 mt-1">{summary.budget_range}</div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2 border-t border-blue-100">
          <Target className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-700">Key Focus</div>
            <div className="text-sm text-gray-900 mt-1">{summary.key_focus}</div>
          </div>
        </div>
      </div>

      {/* Extracted Data Section */}
      <div className="space-y-4">
        {/* Geographic Scope */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <h5 className="font-semibold text-gray-900">Geographic Scope</h5>
          </div>
          <div className="flex flex-wrap gap-2">
            {extracted_data.geographic_scope.map((location, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
              >
                {location}
              </span>
            ))}
          </div>
        </div>

        {/* Target Beneficiaries */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-indigo-600" />
            <h5 className="font-semibold text-gray-900">Target Beneficiaries</h5>
          </div>
          <p className="text-sm text-gray-700">{extracted_data.target_beneficiaries}</p>
        </div>

        {/* Deliverables */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h5 className="font-semibold text-gray-900 mb-3">📦 Deliverables</h5>
          <ul className="space-y-2">
            {extracted_data.deliverables.map((deliverable, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-sm text-gray-700">{deliverable}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Mandatory Requirements */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h5 className="font-semibold text-gray-900 mb-3">⚠️ Mandatory Requirements</h5>
          <ul className="space-y-2">
            {extracted_data.mandatory_requirements.map((req, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 mt-1 font-bold">•</span>
                <span className="text-sm text-gray-700">{req}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Evaluation Criteria */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
          <h5 className="font-semibold text-gray-900 mb-3">📊 Evaluation Criteria</h5>
          <p className="text-sm text-gray-700">{extracted_data.evaluation_criteria}</p>
        </div>
      </div>
    </div>
  );
};

export default RFPAnalysisResults;
