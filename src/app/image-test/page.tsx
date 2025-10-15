export default function ImageTest() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Image Loading Test</h1>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Direct File Access Test</h2>
        <p>Try accessing these URLs directly in your browser:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><a href="/ckcm.png" target="_blank" className="text-blue-500 hover:underline">/ckcm.png</a></li>
          <li><a href="/pmslogo.jpg" target="_blank" className="text-blue-500 hover:underline">/pmslogo.jpg</a></li>
          <li><a href="/test-logo.svg" target="_blank" className="text-blue-500 hover:underline">/test-logo.svg (Fallback)</a></li>
          <li><a href="/test-bg.svg" target="_blank" className="text-blue-500 hover:underline">/test-bg.svg (Fallback)</a></li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Image Display Test</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">CKCM Logo (Original)</h3>
            <img 
              src="/ckcm.png" 
              alt="CKCM Logo" 
              className="w-full h-24 object-contain border"
              onError={(e) => {
                console.error('CKCM logo failed to load')
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling.style.display = 'block'
              }}
            />
            <div style={{display: 'none'}} className="text-red-500">
              ❌ CKCM logo failed to load
            </div>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">PMS Logo (Original)</h3>
            <img 
              src="/pmslogo.jpg" 
              alt="PMS Logo" 
              className="w-full h-24 object-contain border"
              onError={(e) => {
                console.error('PMS logo failed to load')
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling.style.display = 'block'
              }}
            />
            <div style={{display: 'none'}} className="text-red-500">
              ❌ PMS logo failed to load
            </div>
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Test Logo (SVG Fallback)</h3>
            <img 
              src="/test-logo.svg" 
              alt="Test Logo" 
              className="w-full h-24 object-contain border"
            />
          </div>

          <div className="border p-4 rounded">
            <h3 className="font-semibold mb-2">Test Background (SVG Fallback)</h3>
            <img 
              src="/test-bg.svg" 
              alt="Test Background" 
              className="w-full h-24 object-contain border"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">File System Check</h2>
        <p className="text-sm text-gray-600">
          If the original images don't load, it means the files don't exist in the public directory.
          The fallback SVG images should always work.
        </p>
      </div>
    </div>
  )
}





