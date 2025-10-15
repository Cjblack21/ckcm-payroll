import Image from "next/image"
import { DebugImage } from "@/components/debug-image"

export default function TestImages() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Image Test Page</h1>
      
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">CKCM Logo (Next.js Image - Server)</h2>
          <Image 
            src="/ckcm.png" 
            alt="CKCM Logo" 
            width={200}
            height={80}
            className="border"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">CKCM Logo (Debug Client Component)</h2>
          <DebugImage 
            src="/ckcm.png" 
            alt="CKCM Logo" 
            width={200}
            height={80}
            className="border"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">CKCM Logo (Regular img)</h2>
          <img 
            src="/ckcm.png" 
            alt="CKCM Logo" 
            width={200}
            height={80}
            className="border"
            onError={(e) => console.error('CKCM logo (img) failed to load:', e)}
            onLoad={() => console.log('CKCM logo (img) loaded successfully')}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">PMS Logo (Next.js Image - Server)</h2>
          <Image 
            src="/pmslogo.jpg" 
            alt="PMS Logo" 
            width={200}
            height={200}
            className="border"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">PMS Logo (Debug Client Component)</h2>
          <DebugImage 
            src="/pmslogo.jpg" 
            alt="PMS Logo" 
            width={200}
            height={200}
            className="border"
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold">PMS Logo (Regular img)</h2>
          <img 
            src="/pmslogo.jpg" 
            alt="PMS Logo" 
            width={200}
            height={200}
            className="border"
            onError={(e) => console.error('PMS logo (img) failed to load:', e)}
            onLoad={() => console.log('PMS logo (img) loaded successfully')}
          />
        </div>
      </div>
    </div>
  )
}
