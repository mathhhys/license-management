'use client'

import { Button } from '@/components/ui/button'
import React, { useState } from 'react'
import { FiCircle, FiCheckCircle } from "react-icons/fi"
import { Task, setTaskState, updateTask } from './actions'
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface TaskRowProps {
  disabled?: boolean
  task: Task
}

function TaskRow({ task, disabled = false }: TaskRowProps) {
  const [isDone, setIsDone] = useState(task.is_done)

  async function onCheckClicked() {
    await setTaskState(task.id, !isDone)
    setIsDone(!isDone)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name')?.toString() || ''
    const description = formData.get('description')?.toString() || ''
    
    await updateTask(task.id, name, description)
    window.location.reload()
  }

  return (
    <div key={task.id} className={`group flex items-center transition-all w-full ${isDone ? 'text-slate-500' : ''}`}>
      <Button
        variant="link"
        className="text-lg text-inherit disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onCheckClicked}
      >
        {isDone ? <FiCheckCircle /> : <FiCircle />}
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" className={`flex-1 justify-start ${isDone ? 'line-through' : ''}`}>
            {task.name}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>Edit task</DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input 
              id="name"
              name="name"
              defaultValue={task.name || ''}
              disabled={disabled}
            />
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={task.description || ''}
              disabled={disabled}
            />
            <Button type="submit" disabled={disabled}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TaskRow