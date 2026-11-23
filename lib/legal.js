import { COMPANY, RETENTION_DAYS } from './config';
const C = COMPANY;

export const DOCS = {
  terms: {
    title: 'Terms of Service',
    sections: [
      ['About the service', [`${C.brand} (“we”, “us”) is operated by ${C.name}. It provides AI tools to create images and videos, edit media, and plan marketing content. By creating an account or using the service you agree to these terms.`]],
      ['Your account', ['You must be at least 18 years old and give accurate information. Keep your password safe. You are responsible for activity on your account. We may suspend or close accounts that break these terms.']],
      ['Credits', ['Credits pay for generations and tools. The price in credits is shown before you confirm. Credits have no cash value and cannot be transferred. If a generation fails, the credits are returned automatically. Free credits, credit prices and plan allowances may change; we will update the website when they do. If we offer paid plans or top-ups, separate payment terms will apply.']],
      ['Your content and the results', ['You keep the rights you have in what you upload and write. You may use the results for your business, subject to these terms, the acceptable use policy and the terms of the underlying AI providers. AI results can look similar to existing works or to results other people receive. We do not guarantee originality, accuracy or that a result is free of third-party rights.']],
      ['Your responsibilities', ['You must have the right to use anything you upload, and any person shown in an upload must have agreed to it. You are responsible for checking every result and every marketing plan before you publish it, and for following the advertising, consumer, health, finance and data rules in your market. Marketing strategies and forecasts are suggestions, not promises of results. Lead results come from public web pages and may be incomplete or wrong. You are responsible for contacting people lawfully, honestly and with an easy way to opt out. We do not send emails on your behalf.']],
      ['AI limits', ['AI output can be wrong, incomplete or out of date. Competitor research uses public web pages found at the time and may contain mistakes. Nothing in the service is legal, medical, tax or financial advice.']],
      ['Third-party services', ['We rely on other companies to run the service (for example for hosting, storage, AI processing and web search). Their outages or changes can affect the service.']],
      ['Availability', ['The service is provided “as is”. We try to keep it running but do not promise it will always be available or error-free.']],
      ['Suspension and ending', [`We may remove content, limit features, or suspend or close an account that breaks these terms or the acceptable use policy. You can stop using the service at any time and ask us to delete your account at ${C.email}.`]],
      ['Liability', ['To the extent the law allows, we are not liable for indirect or consequential loss, lost profit, or loss from decisions you make using the results. Our total liability for any claim is limited to the amount you paid us in the 12 months before the claim, or [AED amount] if you paid nothing.']],
      ['Changes', ['We may update these terms. If a change is important, we will tell you on the website or by email. Using the service after a change means you accept it.']],
      ['Governing law', [`These terms are governed by the laws of the United Arab Emirates and the courts of ${C.jurisdiction} have jurisdiction, unless the law gives you other rights.`]],
      ['Contact', [`${C.name}, ${C.address}. ${C.email}`]],
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      ['Who we are', [`${C.name} runs ${C.brand}. This policy explains what personal data we collect and why. We aim to follow the data protection laws that apply to us, including the UAE Federal Decree-Law No. 45 of 2021 on personal data protection.`]],
      ['What we collect', ['Account data: your email address and sign-in details.', 'Content: your prompts, interview answers and marketing briefs, files you upload, and the results we create for you.', 'Usage data: your credit balance and history, which tools and models you use, feedback and reports you send, and technical logs such as time and error messages.', 'Lead research: business names, websites and publicly listed business contact details that our tools find on the public web for your campaigns, plus the notes and statuses you add. To check them, our tools open the public home, contact and about pages of those company websites.', 'Local storage on your device keeps you signed in and remembers small settings such as your game score.']],
      ['How we use it', ['To run the service, create your results, keep your history, prevent abuse and fraud, answer support requests, improve quality and reliability, and meet legal duties. We do not sell your personal data.']],
      ['Who processes it', ['To run the service we send data to trusted providers: Supabase (accounts, database and file storage), fal.ai (image, video and media processing, which receive your prompts and the files you upload), Anthropic or OpenRouter (text processing for interviews, strategies, research and safety checks), our hosting provider, and Cloudflare (spam protection at sign-in). These providers may process data outside the UAE.']],
      ['Safety checks', ['Prompts are checked automatically before they are sent to image and video models. Blocked requests are logged so we can protect the service.']],
      ['How long we keep it', [`Results and uploads are deleted automatically after ${RETENTION_DAYS} days. Account data and credit records are kept while your account is open and for as long as the law requires afterwards. Backups may keep deleted data for a short time.`]],
      ['Your rights', [`You can ask us to give you a copy of your data, correct it, or delete it by emailing ${C.email}. Please download any results you want to keep before they expire.`]],
      ['Security', ['We use access controls and encrypted connections. No system is perfectly secure, so please use a strong, unique password.']],
      ['Children', ['The service is not for people under 18, and we do not knowingly collect their data.']],
      ['Changes and contact', [`We may update this policy and will post the new date here. Questions: ${C.email}, ${C.address}.`]],
    ],
  },
  refunds: {
    title: 'Credits & Refunds',
    sections: [
      ['How credits work', ['Each generation or tool shows its price in credits before you confirm. Credits are taken when the job starts.']],
      ['Automatic refunds', ['If a job fails, is rejected by the provider, or times out, the credits are returned to your balance automatically. The same applies to marketing strategies, research and extra content that fail to build.']],
      ['Results you do not like', ['AI results vary and quality is subjective, so credits are not refunded for results that were created successfully. You can try again with a different prompt, model or the prompt booster. If a result is wrong in a way that looks like a fault, contact us and we will review it.']],
      ['Free credits, expiry and balances', ['Free credits are a trial gift and may change. Monthly plan credits, if offered, reset each month. Credits have no cash value.']],
      ['Paid purchases', ['Paid plans and top-ups are not available yet. When they are, refund terms for payments will be published here.']],
      ['Contact', [`Questions about credits or a failed result: ${C.email}`]],
    ],
  },
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    sections: [
      ['Why this exists', ['We want the service to be safe and useful for businesses. These rules apply to everything you type, upload or create.']],
      ['You must not use the service to create or upload', ['Sexual or nude content, or any sexual content involving minors (we report this to the authorities).', 'Realistic images or videos of real people without their clear consent, impersonation, or deepfakes, including public figures and politicians.', 'Hateful, harassing, threatening or extremely violent content, or content that promotes self-harm, terrorism, illegal drugs or weapons trafficking.', 'Scams, fake reviews or testimonials, fake documents, or misleading health, financial or legal claims.', 'Content that infringes someone else’s copyright, trademark or privacy.', 'Malware, or anything meant to break, overload or bypass the limits of the service.', 'Unsolicited mass messages that break the law, collecting personal data of private individuals, or using the lead and email tools to harass, pressure or deceive people.']],
      ['Your marketing must follow the rules where you sell', ['You are responsible for advertising and consumer rules in your market, including special rules for health, medical, financial and real estate promotion. Check every result and plan before you publish it.']],
      ['Uploads of people', ['Only upload photos of people if you have the right to use them and they have agreed to this use.']],
      ['How we enforce', ['Prompts are screened automatically, and we review reports. We may refuse a request, remove content, limit features, or suspend an account, and we may share information with the authorities where the law requires.']],
      ['Report a problem', [`Use the Report button on a result, or email ${C.email}.`]],
    ],
  },
};
