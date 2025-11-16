import { NextResponse } from 'next/server'

export function GET() {
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'unknown'
  const buildTime = process.env.BUILD_TIME ?? 'unknown'
  return NextResponse.json({ commit, buildTime })
}
