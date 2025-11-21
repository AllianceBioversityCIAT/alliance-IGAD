import React from 'react'
import styles from './step3.module.css'
import { FileText, CheckCircle } from 'lucide-react'

interface Section {
  section_title: string
  purpose: string
  recommended_word_count: string
  guiding_questions: string[]
}

interface ConceptDocument {
  proposal_outline: Section[]
  hcd_notes?: Array<{ note: string }>
}

interface Step3Props {
  conceptDocument: ConceptDocument | null
}

const Step3StructureValidation: React.FC<Step3Props> = ({ conceptDocument }) => {
  console.log('📄 Step3 received conceptDocument:', conceptDocument)
  
  if (!conceptDocument || !conceptDocument.proposal_outline) {
    return (
      <div className={styles.emptyState}>
        <FileText size={48} />
        <p>No proposal outline available. Please complete Step 2 first.</p>
      </div>
    )
  }

  const { proposal_outline, hcd_notes } = conceptDocument

  return (
    <div className={styles.step3Container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <CheckCircle size={24} />
        </div>
        <div className={styles.headerText}>
          <h2 className={styles.title}>Structure & Validation</h2>
          <p className={styles.subtitle}>
            Organize and validate the generated content structure.
          </p>
        </div>
      </div>

      <div className={styles.validationCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Structure Validation</h3>
          <p className={styles.cardSubtitle}>
            This step will organize and validate your proposal structure.
          </p>
        </div>

        <div className={styles.outlineContainer}>
          <h4 className={styles.outlineTitle}>Proposal Outline</h4>
          <div className={styles.sectionsList}>
            {proposal_outline.map((section, index) => (
              <div key={index} className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionNumber}>{index + 1}</span>
                  <h5 className={styles.sectionTitle}>{section.section_title}</h5>
                  <span className={styles.wordCount}>{section.recommended_word_count}</span>
                </div>
                
                <p className={styles.sectionPurpose}>{section.purpose}</p>
                
                {section.guiding_questions && section.guiding_questions.length > 0 && (
                  <div className={styles.questionsSection}>
                    <h6 className={styles.questionsTitle}>Guiding Questions:</h6>
                    <ul className={styles.questionsList}>
                      {section.guiding_questions.map((question, qIndex) => (
                        <li key={qIndex}>{question}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {hcd_notes && hcd_notes.length > 0 && (
          <div className={styles.notesContainer}>
            <h4 className={styles.notesTitle}>Design Notes</h4>
            <div className={styles.notesList}>
              {hcd_notes.map((item, index) => (
                <div key={index} className={styles.noteItem}>
                  <div className={styles.noteIcon}>💡</div>
                  <p className={styles.noteText}>{item.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Step3StructureValidation
