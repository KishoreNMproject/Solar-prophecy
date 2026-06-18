export const privacyPolicyText = `**Privacy Policy for Solar Prophecy**

**Effective Date:** 2026-06-18

**1. Introduction**
Welcome to Solar Prophecy ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, Solar Prophecy (the "App").

**2. Information We Collect**
Solar Prophecy is designed as a local-first analytics platform. 
* **Local Data Storage:** The App stores your solar observation data locally on your device. We do not automatically upload this data to our servers.
* **Import/Export:** The App allows you to import and export your backup data to your device's local storage. This process is managed entirely on your device using native Android APIs.
* **Automatically Collected Information:** When you use the App, we may automatically collect certain non-personal information, such as your device model, operating system version, and general usage data (e.g., app crashes, feature usage) to help us improve the App's stability and performance.

**3. How We Use Your Information**
We use the information we collect to:
* Provide, maintain, and improve the App's functionality.
* Identify and fix technical errors, crashes, and performance issues.
* Enhance the accuracy of our analytics and forecasting algorithms without accessing your personal raw data.

**4. Data Sharing and Disclosure**
We do not sell, trade, or rent your personal information to third parties. We may disclose your information only if required to do so by law or in response to valid requests by public authorities.

**5. Data Security**
We implement reasonable security measures to protect the information we collect. However, please be aware that no method of transmission over the internet or method of electronic storage is 100% secure. Because your solar data is primarily stored locally on your device, the security of that data depends on the security measures you apply to your device.

**6. Changes to This Privacy Policy**
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the App and updating the "Effective Date" at the top.

**7. Contact Us**
If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us.`;

export const termsOfServiceText = `**Terms of Service for Solar Prophecy**

**Effective Date:** 2026-06-18

**1. Acceptance of Terms**
By downloading, accessing, or using the Solar Prophecy mobile application (the "App"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, you may not access or use the App.

**2. Description of Service**
Solar Prophecy is an advanced solar analytics and forecasting platform designed to help users track and project their solar generation metrics. 

**3. Use of the App**
* **Data Accuracy:** The App provides forecasts and analytics based on the data you provide. We do not guarantee the absolute accuracy of these forecasts, particularly during the initial learning phases when limited historical data is available.
* **Prohibited Uses:** You agree not to use the App for any unlawful purpose or in any way that could damage, disable, overburden, or impair the App.
* **Updates:** We may update the App periodically to add new features, fix bugs, or improve performance. You agree to receive these updates.

**4. Intellectual Property**
The App and its original content, features, functionality, and design are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws. 

**5. Disclaimer of Warranties**
The App is provided on an "AS IS" and "AS AVAILABLE" basis. We make no representations or warranties of any kind, express or implied, regarding the use or the results of the App in terms of its correctness, accuracy, reliability, or otherwise.

**6. Limitation of Liability**
In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the App.

**7. Changes to Terms**
We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our App after those revisions become effective, you agree to be bound by the revised terms.

**8. Governing Law**
These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which the developer resides, without regard to its conflict of law provisions.

**9. Contact Us**
If you have any questions about these Terms, please contact us.`;

export function showLegalModal(title, content) {
  const overlay = document.getElementById('legalModalOverlay');
  const titleEl = document.getElementById('legalModalTitle');
  const contentEl = document.getElementById('legalModalContent');
  
  if (overlay && titleEl && contentEl) {
    titleEl.textContent = title;
    // Simple markdown parsing for bold and bullets
    let htmlContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    htmlContent = htmlContent.replace(/\* (.*)/g, '<li>$1</li>');
    htmlContent = htmlContent.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
    htmlContent = htmlContent.replace(/<\/ul>\n<ul>/g, '\n');
    contentEl.innerHTML = htmlContent;
    overlay.style.display = 'flex';
  }
}

export function initLegalModals() {
  const closeBtn = document.getElementById('closeLegalModal');
  const closeBtnBottom = document.getElementById('closeLegalModalBottom');
  const overlay = document.getElementById('legalModalOverlay');
  
  if (overlay) {
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }
    if (closeBtnBottom) {
      closeBtnBottom.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }
  }

  // Consent Modal Logic
  const consentOverlay = document.getElementById('consentModalOverlay');
  const acceptConsentBtn = document.getElementById('acceptConsentBtn');
  const onboardingTermsLink = document.getElementById('onboardingTermsLink');
  const onboardingPrivacyLink = document.getElementById('onboardingPrivacyLink');

  if (consentOverlay && acceptConsentBtn && !localStorage.getItem('legal_consent_accepted')) {
    consentOverlay.style.display = 'flex';

    acceptConsentBtn.addEventListener('click', () => {
      localStorage.setItem('legal_consent_accepted', 'true');
      consentOverlay.style.display = 'none';
    });

    if (onboardingTermsLink) {
      onboardingTermsLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLegalModal("Terms of Service", termsOfServiceText);
      });
    }

    if (onboardingPrivacyLink) {
      onboardingPrivacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        showLegalModal("Privacy Policy", privacyPolicyText);
      });
    }
  }
}
