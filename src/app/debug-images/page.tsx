import { DebugImageTest } from "@/components/debug-image-test"

export default function DebugImagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Image Debug Test Page</h1>
        <DebugImageTest />
      </div>
    </div>
  )
}