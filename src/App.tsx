import Workspace from './components/Workspace'
import { useTableEditor } from './hooks/useTableEditor'

export default function App() {
  const editor = useTableEditor()
  return <Workspace editor={editor} />
}
