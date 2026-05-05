'use client'

import { AlertCircle, CheckCircle2, Heart, Syringe, FileText, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface HealthRecord {
  id: string
  recordType: string
  description: string
  date: string
  diagnosis?: string
  severity?: string
  vaccineName?: string
  treatment?: string
  notes?: string
}

interface HealthTimelineProps {
  records: HealthRecord[]
  loading?: boolean
}

export function HealthTimeline({ records, loading }: HealthTimelineProps) {
  const getRecordIcon = (recordType: string) => {
    switch (recordType) {
      case 'vaccination':
        return <Syringe className="w-5 h-5 text-blue-600" />
      case 'treatment':
        return <Heart className="w-5 h-5 text-green-600" />
      case 'diagnosis':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'checkup':
        return <CheckCircle2 className="w-5 h-5 text-gray-600" />
      default:
        return <FileText className="w-5 h-5 text-gray-600" />
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'mild':
        return 'bg-yellow-100 text-yellow-800'
      case 'moderate':
        return 'bg-orange-100 text-orange-800'
      case 'severe':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-gray-500">Loading health history...</div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Heart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No health records yet</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {records.map((record, index) => (
        <div key={record.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100">
              {getRecordIcon(record.recordType)}
            </div>
            {index < records.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
            )}
          </div>

          <div className="flex-1 pb-4">
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold capitalize">{record.recordType}</h4>
                  <p className="text-sm text-gray-500">
                    {new Date(record.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                {record.severity && (
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${getSeverityColor(record.severity)}`}>
                    {record.severity}
                  </span>
                )}
              </div>

              <p className="text-sm mb-3">{record.description}</p>

              <div className="grid grid-cols-1 gap-2 text-sm">
                {record.vaccineName && (
                  <div><span className="font-medium">Vaccine:</span> {record.vaccineName}</div>
                )}
                {record.diagnosis && (
                  <div><span className="font-medium">Diagnosis:</span> {record.diagnosis}</div>
                )}
                {record.treatment && (
                  <div className="border-t pt-2">
                    <span className="font-medium">Treatment:</span>
                    <p className="text-gray-600 mt-1">{record.treatment}</p>
                  </div>
                )}
                {record.notes && (
                  <div className="border-t pt-2">
                    <span className="font-medium">Notes:</span>
                    <p className="text-gray-600 mt-1">{record.notes}</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ))}
    </div>
  )
}
