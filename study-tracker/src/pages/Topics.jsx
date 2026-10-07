// Placeholder topic list. Detail page comes in Job 4.
import { Link } from 'react-router-dom'

const topics = [
  { id: 'js', name: 'JavaScript' },
  { id: 'react', name: 'React' },
  { id: 'project1', name: 'Project 1' },
  { id: 'project2', name: 'Project 2' },
  { id: 'apps', name: 'Applications' },
]

export default function Topics() {
  return (
    <div>
      <h2 className="text-[28px] font-semibold mb-4">Topics</h2>
      <div className="flex flex-col gap-2">
        {topics.map((t) => (
          <Link
            key={t.id}
            to={`/topic/${t.id}`}
            className="rounded-xl border border-border bg-surface p-4 hover:bg-raised"
          >
            {t.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
