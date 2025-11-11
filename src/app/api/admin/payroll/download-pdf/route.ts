import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import puppeteer from 'puppeteer'

export async function POST(request: NextRequest) {
  let browser = null
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { periodStart, periodEnd } = body

    console.log('📥 Generating PDF for period:', periodStart, 'to', periodEnd)

    // Get the HTML from print-screenshot route
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const htmlResponse = await fetch(`${baseUrl}/api/admin/payroll/print-screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({ periodStart, periodEnd })
    })

    if (!htmlResponse.ok) {
      throw new Error('Failed to generate payslip HTML')
    }

    const html = await htmlResponse.text()
    console.log('✅ Got HTML content, length:', html.length)

    // Launch Puppeteer with better Windows compatibility
    console.log('🚀 Launching browser...')
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ],
      timeout: 60000
    })

    const page = await browser.newPage()
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 816, height: 1056 }) // 8.5in x 11in at 96 DPI

    // Load the HTML
    await page.setContent(html, { waitUntil: 'networkidle0' })
    console.log('✅ HTML loaded in browser')

    // Generate PDF with correct page size (8.5in x 13in)
    const pdfBuffer = await page.pdf({
      format: 'Legal', // 8.5in x 14in (closest to 13in)
      printBackground: true,
      margin: {
        top: '0.15in',
        right: '0.15in',
        bottom: '0.15in',
        left: '0.15in'
      }
    })

    console.log('✅ PDF generated, size:', pdfBuffer.length, 'bytes')

    await browser.close()
    browser = null

    // Return PDF as download
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslips-${periodStart}-to-${periodEnd}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Error generating PDF:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('❌ Error name:', error instanceof Error ? error.name : 'Unknown')
    
    if (browser) {
      try {
        await browser.close()
        console.log('✅ Browser closed successfully')
      } catch (closeError) {
        console.error('❌ Error closing browser:', closeError)
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
