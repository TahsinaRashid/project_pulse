This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Employee dashboard

The employee workspace is available at `/dashboard/employee`. Employee dashboard APIs require an authenticated `EMPLOYEE` account and scope project data and mutations to projects assigned to that employee. Project details include weekly check-ins, risks, and a database-backed activity timeline.

Weekly check-ins use the ISO week boundary (Monday at 00:00 UTC). The server calculates the week start rather than trusting a client-supplied date, and creates a unique MongoDB index across project, employee, and week start. That index prevents duplicate submissions even when concurrent requests race.

Project health is recalculated from client satisfaction and employee confidence submitted in the last 90 days, estimated progress against the project timeline, flagged client issues, and open risk severity. Scores map to On Track (80–100), At Risk (60–79), and Critical (below 60); Completed projects retain their Completed status.

## Client dashboard

The client workspace is available at `/dashboard/client`. Client dashboard and project APIs require an authenticated `CLIENT` account and scope all project reads and feedback submissions to projects assigned to that client. The project detail view shows a client-safe activity timeline, this week's feedback form, and feedback history for that client.

Client feedback is limited to one submission per assigned project per ISO week (Monday at 00:00 UTC). The server calculates the week start; a unique MongoDB index across project, client, and week start prevents duplicate submissions, including concurrent requests. Feedback fields are validated server-side, flagged issues require a description, and every new submission triggers a project health recalculation.
