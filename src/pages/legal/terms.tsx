import LegalPageShell from './legal-page-shell'

export default function TermsOfServicePage() {
  return (
    <LegalPageShell
      slug="terms"
      fallbackTitle="Terms of Service"
      fallbackDescription="These terms of service govern your use of the Co-Exist app and website. By creating an account you agree to these terms."
    />
  )
}
