import { useEffect } from 'react'
import { useAppStore } from './store'
import { InlineToolbar } from './components/InlineToolbar'
import { Fab } from './components/Fab'

interface Props {
  fab?: boolean
}

export function App({ fab }: Props) {
  const initializeStore = useAppStore((s) => s.initializeStore)

  useEffect(() => {
    initializeStore()
  }, [initializeStore])

  return fab ? <Fab /> : <InlineToolbar />
}
