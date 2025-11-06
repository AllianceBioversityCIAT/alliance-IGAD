import { forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="input-wrapper">
        <input
          className={clsx(
            'form-input',
            error && 'form-input-error',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="form-error">{error}</span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
