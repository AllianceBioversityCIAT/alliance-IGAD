import { useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import styles from './ManualRFPInput.module.css'

interface ManualRFPInputProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (text: string) => void
  isProcessing: boolean
}

export function ManualRFPInput({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}: ManualRFPInputProps) {
  const [rfpText, setRfpText] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (rfpText.trim().length < 100) {
      alert('Please enter at least 100 characters of RFP text')
      return
    }
    onSubmit(rfpText)
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setRfpText(text)
    } catch (err) {
      alert('Failed to read clipboard. Please paste manually.')
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.header}>
          <FileText size={32} className={styles.icon} />
          <h2 className={styles.title}>Enter RFP Text Manually</h2>
          <p className={styles.subtitle}>
            Copy and paste the RFP content here. You can extract text from your PDF using Adobe
            Reader or an online tool.
          </p>
        </div>

        <div className={styles.content}>
          <div className={styles.inputSection}>
            <label className={styles.label}>RFP Content</label>
            <textarea
              className={styles.textarea}
              value={rfpText}
              onChange={e => setRfpText(e.target.value)}
              placeholder="Paste your RFP text here...

Include all important sections:
- Project overview
- Requirements
- Evaluation criteria
- Deliverables
- Timeline
- Budget range
- Submission details"
              rows={15}
              disabled={isProcessing}
            />
            <div className={styles.charCount}>
              {rfpText.length.toLocaleString()} characters
              {rfpText.length < 100 && ' (minimum 100 required)'}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              className={styles.buttonSecondary}
              onClick={handlePaste}
              disabled={isProcessing}
            >
              <Upload size={16} />
              Paste from Clipboard
            </button>
            <div className={styles.actionGroup}>
              <button
                className={styles.buttonCancel}
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                className={styles.buttonPrimary}
                onClick={handleSubmit}
                disabled={isProcessing || rfpText.length < 100}
              >
                {isProcessing ? 'Processing...' : 'Process Text'}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.helpSection}>
          <p className={styles.helpTitle}>💡 How to extract text from PDF:</p>
          <ul className={styles.helpList}>
            <li>Open PDF in Adobe Reader → Select All → Copy</li>
            <li>Use online tools like pdf2go.com or smallpdf.com</li>
            <li>Use Google Docs: Upload PDF → Download as Text</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
