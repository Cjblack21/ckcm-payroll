export default function TestSimpleImagesPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Simple Image Test</h1>
        
        {/* Test 1: Direct img tags */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 1: Direct img tags</h2>
          <div className="flex space-x-4">
            <div className="text-center">
              <img 
                src="/ckcm.png" 
                alt="CKCM" 
                className="w-24 h-24 object-contain border-2 border-red-500"
                style={{backgroundColor: 'yellow'}}
              />
              <p className="text-sm mt-2">CKCM PNG</p>
            </div>
            <div className="text-center">
              <img 
                src="/pmslogo.jpg" 
                alt="PMS" 
                className="w-24 h-24 object-contain border-2 border-blue-500"
                style={{backgroundColor: 'yellow'}}
              />
              <p className="text-sm mt-2">PMS JPG</p>
            </div>
            <div className="text-center">
              <img 
                src="/favicon.ico" 
                alt="Favicon" 
                className="w-24 h-24 object-contain border-2 border-green-500"
                style={{backgroundColor: 'yellow'}}
              />
              <p className="text-sm mt-2">Favicon ICO</p>
            </div>
          </div>
        </div>

        {/* Test 2: Simple divs with background images */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 2: CSS background images</h2>
          <div className="flex space-x-4">
            <div 
              className="w-24 h-24 border-2 border-red-500"
              style={{
                backgroundImage: 'url(/ckcm.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: 'yellow'
              }}
            />
            <div 
              className="w-24 h-24 border-2 border-blue-500"
              style={{
                backgroundImage: 'url(/pmslogo.jpg)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: 'yellow'
              }}
            />
            <div 
              className="w-24 h-24 border-2 border-green-500"
              style={{
                backgroundImage: 'url(/favicon.ico)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundColor: 'yellow'
              }}
            />
          </div>
        </div>

        {/* Test 3: File size info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">File Information</h2>
          <div className="space-y-2 text-sm">
            <div>CKCM PNG: 4,495,747 bytes (4.4MB) - VERY LARGE</div>
            <div>PMS JPG: 17,510 bytes (17KB) - Normal size</div>
            <div>Favicon ICO: 4,495,747 bytes (4.4MB) - VERY LARGE</div>
          </div>
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <p className="text-sm"><strong>Issue Identified:</strong> The CKCM.png and favicon.ico files are extremely large (4.4MB each). This could cause:</p>
            <ul className="text-sm mt-2 list-disc list-inside">
              <li>Very slow loading times</li>
              <li>Browser timeout issues</li>
              <li>Memory issues on mobile devices</li>
              <li>Network errors</li>
            </ul>
          </div>
        </div>

        {/* Test 4: Network test */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Network Test Links</h2>
          <div className="space-y-2">
            <div>
              <a href="/ckcm.png" target="_blank" className="text-blue-600 hover:underline">
                Direct link to CKCM PNG
              </a>
            </div>
            <div>
              <a href="/pmslogo.jpg" target="_blank" className="text-blue-600 hover:underline">
                Direct link to PMS JPG
              </a>
            </div>
            <div>
              <a href="/favicon.ico" target="_blank" className="text-blue-600 hover:underline">
                Direct link to Favicon ICO
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}





