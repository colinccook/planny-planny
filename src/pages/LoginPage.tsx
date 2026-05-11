import LoginForm from '../components/auth/LoginForm'
import SuccessfulMealsHeadline from '../components/auth/SuccessfulMealsHeadline'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">
        <SuccessfulMealsHeadline />
        <LoginForm />
      </div>
    </div>
  )
}
