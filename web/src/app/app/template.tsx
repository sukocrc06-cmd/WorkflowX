import { ViewTransition } from 'react';

/* Each navigation inside /app re-mounts this template: the old page fades up and out, the new one rises in
   (React <ViewTransition>, CSS in globals.css). Browsers without the API simply swap instantly. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <ViewTransition enter="page-in" exit="page-out" default="none">{children}</ViewTransition>;
}
