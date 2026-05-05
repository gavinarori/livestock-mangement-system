'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnimalFormProps {
  onSubmit: (data: any) => Promise<void>
  initialData?: any
  isLoading?: boolean
  submitLabel?: string
}

const ANIMAL_TYPES = ['cattle', 'sheep', 'goat', 'pig', 'poultry', 'horse', 'other']
const HEALTH_STATUSES = ['healthy', 'sick', 'injured', 'recovering']

export function AnimalForm({
  onSubmit,
  initialData,
  isLoading = false,
  submitLabel = 'Create Animal'
}: AnimalFormProps) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    type: 'cattle',
    breed: '',
    dateOfBirth: '',
    weight: '',
    color: '',
    identifier: '',
    notes: '',
    healthStatus: 'healthy'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isLoading)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onSubmit(formData)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
      console.error('[v0] Form submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Animal Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-foreground">
                Animal Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Bessie, Daisy"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="block text-sm font-medium text-foreground">
                Animal Type <span className="text-destructive">*</span>
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
              >
                {ANIMAL_TYPES.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="breed" className="block text-sm font-medium text-foreground">
                Breed
              </label>
              <Input
                id="breed"
                name="breed"
                type="text"
                placeholder="e.g., Holstein, Merino"
                value={formData.breed}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="identifier" className="block text-sm font-medium text-foreground">
                Identifier / Tag Number
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="e.g., #12345"
                value={formData.identifier}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="dateOfBirth" className="block text-sm font-medium text-foreground">
                Date of Birth
              </label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="weight" className="block text-sm font-medium text-foreground">
                Weight (kg)
              </label>
              <Input
                id="weight"
                name="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 500"
                value={formData.weight}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="color" className="block text-sm font-medium text-foreground">
                Color / Markings
              </label>
              <Input
                id="color"
                name="color"
                type="text"
                placeholder="e.g., Black and White"
                value={formData.color}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="healthStatus" className="block text-sm font-medium text-foreground">
                Health Status
              </label>
              <select
                id="healthStatus"
                name="healthStatus"
                value={formData.healthStatus}
                onChange={handleChange}
                disabled={loading}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
              >
                {HEALTH_STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium text-foreground">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about the animal..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground text-sm"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
