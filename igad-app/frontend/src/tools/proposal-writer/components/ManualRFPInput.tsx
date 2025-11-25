import React, { useState } from 'react'

interface ManualRFPInputProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => Promise<void>
  isProcessing: boolean
}

const ManualRFPInput: React.FC<ManualRFPInputProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  const [rfpText, setRfpText] = useState('')

  const handleSubmit = async () => {
    if (rfpText.trim()) {
      await onSubmit(rfpText)
      setRfpText('')
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900">Manual RFP Input</h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <p className="text-sm text-gray-600 mb-4">
            Paste the RFP text content below. This will be used for AI analysis.
          </p>
          <textarea
            value={rfpText}
            onChange={e => setRfpText(e.target.value)}
            disabled={isProcessing}
            placeholder="Paste your RFP content here..."
            className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#009639] focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <div className="mt-2 text-sm text-gray-500">{rfpText.length} characters</div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rfpText.trim() || isProcessing}
            className="px-6 py-2 bg-[#009639] text-white rounded-lg hover:bg-[#007d2f] disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Processing...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ManualRFPInput
