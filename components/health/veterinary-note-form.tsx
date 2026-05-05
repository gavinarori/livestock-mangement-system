'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface VeterinaryNoteFormProps {
  animalId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function VeterinaryNoteForm({ animalId, onSuccess, onCancel }: VeterinaryNoteFormProps) {
  const [formData, setFormData] = useState({
    veterinarian: '',
    date: new Date().toISOString().split('T')[0],
    examination: '',
    diagnosis: '',
    recommendations: '',
    prescriptions: '',
    followUpDate: '',
    notes: ''
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setError('Authentication required')
        return
      }

      const payload = {
        veterinarian: formData.veterinarian,
        date: formData.date,
        examination: formData.examination,
        diagnosis: formData.diagnosis || undefined,
        recommendations: formData.recommendations,
        prescriptions: formData.prescriptions || undefined,
        followUpDate: formData.followUpDate || undefined,
        notes: formData.notes || undefined
      }

      const response = await fetch(`/api/animals/${animalId}/veterinary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create veterinary note')
      }

      setSuccess(true)
      setFormData({
        veterinarian: '',
        date: new Date().toISOString().split('T')[0],
        examination: '',
        diagnosis: '',
        recommendations: '',
        prescriptions: '',
        followUpDate: '',
        notes: ''
      })

      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      console.error('[v0] Vet note form error:', err)
      setError(err.message || 'Failed to create veterinary note')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Veterinary Note</CardTitle>
        <CardDescription>Document professional veterinary observations and recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" />
              Veterinary note created successfully
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Veterinarian Name</label>
                <Input
                  value={formData.veterinarian}
                  onChange={(e) => setFormData({ ...formData, veterinarian: e.target.value })}
                  placeholder="Dr. Smith"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Examination Findings</label>
              <Textarea
                value={formData.examination}
                onChange={(e) => setFormData({ ...formData, examination: e.target.value })}
                placeholder="Detailed examination findings..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Diagnosis (Optional)</label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Diagnosis if applicable..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Recommendations</label>
              <Textarea
                value={formData.recommendations}
                onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                placeholder="Treatment recommendations and care instructions..."
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Prescriptions (Optional)</label>
              <Textarea
                value={formData.prescriptions}
                onChange={(e) => setFormData({ ...formData, prescriptions: e.target.value })}
                placeholder="Medications and dosages..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Follow-up Date (Optional)</label>
              <Input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Additional Notes (Optional)</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Note'
              )}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
