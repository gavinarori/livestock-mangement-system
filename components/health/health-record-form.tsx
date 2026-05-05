'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

interface HealthRecordFormProps {
  animalId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function HealthRecordForm({ animalId, onSuccess, onCancel }: HealthRecordFormProps) {
  const [formData, setFormData] = useState({
    recordType: 'checkup',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vaccineName: '',
    diagnosis: '',
    diseaseCategory: '',
    severity: '',
    treatment: '',
    temperature: '',
    weight: '',
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
        recordType: formData.recordType,
        description: formData.description,
        date: formData.date,
        vaccineName: formData.vaccineName || undefined,
        diagnosis: formData.diagnosis || undefined,
        diseaseCategory: formData.diseaseCategory || undefined,
        severity: formData.severity || undefined,
        treatment: formData.treatment || undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        notes: formData.notes || undefined
      }

      const response = await fetch(`/api/animals/${animalId}/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create health record')
      }

      setSuccess(true)
      setFormData({
        recordType: 'checkup',
        description: '',
        date: new Date().toISOString().split('T')[0],
        vaccineName: '',
        diagnosis: '',
        diseaseCategory: '',
        severity: '',
        treatment: '',
        temperature: '',
        weight: '',
        notes: ''
      })

      setTimeout(() => {
        setSuccess(false)
        onSuccess?.()
      }, 2000)
    } catch (err: any) {
      console.error('[v0] Health record form error:', err)
      setError(err.message || 'Failed to create health record')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Health Record</CardTitle>
        <CardDescription>Document health checks, vaccinations, and treatments</CardDescription>
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
              Health record created successfully
            </div>
          )}

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Record Type</label>
                <Select value={formData.recordType} onValueChange={(value) => setFormData({ ...formData, recordType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaccination">Vaccination</SelectItem>
                    <SelectItem value="treatment">Treatment</SelectItem>
                    <SelectItem value="checkup">Checkup</SelectItem>
                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                  </SelectContent>
                </Select>
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
              <label className="text-sm font-medium mb-1.5 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the health event..."
                required
              />
            </div>

            {formData.recordType === 'vaccination' && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vaccine Name</label>
                <Input
                  value={formData.vaccineName}
                  onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                  placeholder="e.g., FMD Vaccine"
                />
              </div>
            )}

            {formData.recordType === 'diagnosis' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Diagnosis</label>
                  <Input
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="Disease or condition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Disease Category</label>
                    <Select value={formData.diseaseCategory} onValueChange={(value) => setFormData({ ...formData, diseaseCategory: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFECTIOUS">Infectious</SelectItem>
                        <SelectItem value="GENETIC">Genetic</SelectItem>
                        <SelectItem value="NUTRITIONAL">Nutritional</SelectItem>
                        <SelectItem value="ENVIRONMENTAL">Environmental</SelectItem>
                        <SelectItem value="PARASITIC">Parasitic</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Severity</label>
                    <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mild">Mild</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1.5 block">Treatment</label>
                  <Textarea
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    placeholder="Treatment plan..."
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Temperature (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  placeholder="e.g., 38.5"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Weight (kg)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
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
                'Save Record'
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
