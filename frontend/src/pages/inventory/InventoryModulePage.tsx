import { motion } from 'framer-motion'

interface InventoryModulePageProps {
  title: string
  description: string
}

export default function InventoryModulePage({ title, description }: InventoryModulePageProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <header>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-1 text-sm text-gray-300">{description}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-cyan-300">Status</p>
          <p className="mt-2 text-sm text-gray-200">Module ready for inventory operations.</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-fuchsia-300">Data Integrity</p>
          <p className="mt-2 text-sm text-gray-200">Actions in this section are available only to authenticated users.</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-emerald-300">Next Step</p>
          <p className="mt-2 text-sm text-gray-200">Connect this module to your backend inventory APIs.</p>
        </article>
      </div>
    </motion.section>
  )
}
