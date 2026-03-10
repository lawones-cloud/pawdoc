import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center text-center px-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <p className="text-8xl font-bold text-gradient">404</p>
        <h1 className="text-2xl font-semibold text-white">Page not found</h1>
        <p className="text-white/40">This page doesn't exist or has been moved.</p>
        <Link to="/" className="btn-primary inline-flex rounded-xl px-6 py-3 text-sm text-white">← Go home</Link>
      </motion.div>
    </div>
  )
}
