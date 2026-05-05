'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Eye } from 'lucide-react'
import { Animal } from '@/lib/db/models'

interface AnimalListProps {
  animals: any[]
  onDelete?: (id: string) => Promise<void>
}

const ANIMAL_COLORS: Record<string, string> = {
  cattle: 'bg-amber-100 text-amber-800',
  sheep: 'bg-gray-100 text-gray-800',
  goat: 'bg-orange-100 text-orange-800',
  pig: 'bg-pink-100 text-pink-800',
  poultry: 'bg-yellow-100 text-yellow-800',
  horse: 'bg-red-100 text-red-800',
  other: 'bg-slate-100 text-slate-800'
}

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800',
  sick: 'bg-red-100 text-red-800',
  injured: 'bg-yellow-100 text-yellow-800',
  recovering: 'bg-blue-100 text-blue-800'
}

export function AnimalList({ animals, onDelete }: AnimalListProps) {
  if (animals.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground mb-4">No animals yet. Start by adding your first animal.</p>
        <Link href="/animals/new">
          <Button>Add Animal</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {animals.map((animal: any) => (
        <Card key={animal._id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-foreground">{animal.name}</h3>
                <Badge className={ANIMAL_COLORS[animal.type] || ANIMAL_COLORS.other}>
                  {animal.type}
                </Badge>
                {animal.healthStatus && (
                  <Badge className={HEALTH_COLORS[animal.healthStatus]}>
                    {animal.healthStatus}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                {animal.breed && (
                  <div>
                    <span className="font-medium">Breed:</span> {animal.breed}
                  </div>
                )}
                {animal.identifier && (
                  <div>
                    <span className="font-medium">ID:</span> {animal.identifier}
                  </div>
                )}
                {animal.weight && (
                  <div>
                    <span className="font-medium">Weight:</span> {animal.weight} kg
                  </div>
                )}
                {animal.color && (
                  <div>
                    <span className="font-medium">Color:</span> {animal.color}
                  </div>
                )}
              </div>

              {animal.notes && (
                <p className="mt-2 text-sm text-muted-foreground italic">{animal.notes}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Link href={`/animals/${animal._id}`}>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4" />
                  <span className="sr-only">View</span>
                </Button>
              </Link>
              <Link href={`/animals/${animal._id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete?.(animal._id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
