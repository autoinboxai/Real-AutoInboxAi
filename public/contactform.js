// Runs only on Shopify contact page
if (window.location.pathname.includes('/contact')) {
  const form = document.querySelector('form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    const data = {
      name: form.querySelector('[name="name"]')?.value,
      email: form.querySelector('[name="email"]')?.value,
      message: form.querySelector('[name="message"]')?.value
    };

    try {
      const response = await fetch('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      console.log('Form submitted to webhook:', await response.text());
    } catch (err) {
      console.error('Webhook submission error:', err);
    }
  });
}
