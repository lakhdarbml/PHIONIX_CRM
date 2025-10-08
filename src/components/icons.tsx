import type { SVGProps } from 'react';

export function GoogleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15.5 10.2c.3-.8.5-1.7.5-2.7a5.5 5.5 0 0 0-11 0c0 1 .2 1.9.5 2.7" />
      <path d="M4 14.8c-.8 1-.9 2.3-.3 3.4.5.9 1.4 1.4 2.4 1.4h12c1 0 1.9-.5 2.4-1.4.6-1.1.5-2.4-.3-3.4" />
      <path d="M12 12.2c-2 0-3.8-.7-5-2.2" />
      <path d="m17 10-1.1 1.1" />
    </svg>
  );
}

export function MicrosoftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
        <rect x="3" y="3" width="8" height="8" fill="#f25022" />
        <rect x="13" y="3" width="8" height="8" fill="#7fba00" />
        <rect x="3" y="13" width="8" height="8" fill="#00a4ef" />
        <rect x="13" y="13" width="8" height="8" fill="#ffb900" />
    </svg>
  );
}

export function PhoenixIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        <path d="M12 2c4 0 6 2 6 6s-2 6-6 6-6-2-6-6 2-6 6-6z" />
        <path d="M12 8c-1.5 0-2.7 1.2-2.7 2.7 0 1.5 1.2 2.7 2.7 2.7s2.7-1.2 2.7-2.7c0-1.5-1.2-2.7-2.7-2.7z" />
        <path d="M5 14c-2 2-2 5 0 7s5 2 7 0" />
        <path d="M19 14c2 2 2 5 0 7s-5 2-7 0" />
        <path d="M2 22s4-4 10-4 10 4 10 4" />
        <path d="M12 18s-2-2-2-4 2-4 2-4 2 2 2 4-2 4-2 4z" />
    </svg>
  );
}
