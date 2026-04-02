interface RoleBadgeProps {
  role: string
}

const roleStyles: Record<string, string> = {
  owner: 'bg-emerald-100 text-emerald-800',
  member: 'bg-blue-100 text-blue-800',
  guest: 'bg-gray-100 text-gray-800',
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleStyles[role] ?? roleStyles.guest}`}
    >
      {role}
    </span>
  )
}
