const { PrismaClient } = require('@prisma/client')

async function main() {
	const prisma = new PrismaClient()
	try {
		const now = new Date()
		const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
		const startOfYesterday = new Date(startOfToday)
		startOfYesterday.setDate(startOfYesterday.getDate() - 1)
		const endOfYesterday = new Date(startOfToday)
		endOfYesterday.setMilliseconds(endOfYesterday.getMilliseconds() - 1)

		const del = await prisma.attendance.deleteMany({
			where: { date: { gte: startOfYesterday, lte: endOfYesterday } },
		})
		console.log('Deleted attendance records (yesterday):', del.count)

		const remain = await prisma.attendance.findMany({
			select: { date: true },
			orderBy: { date: 'asc' },
		})
		const dates = Array.from(new Set(remain.map(r => r.date.toISOString().slice(0, 10))))
		console.log('Remaining attendance dates:', dates)
	} catch (err) {
		console.error('Cleanup error:', err)
		process.exitCode = 1
	}
}

main()





