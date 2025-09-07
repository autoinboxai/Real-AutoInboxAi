// Runs only on Shopify contact page
if (window.location.pathname.includes('/contact')) {
  const form = document.querySelector('form[action="/contact"]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // prevent default submission

    const data = {
      name: form.querySelector('[name="contact[name]"]')?.value || '',
      email: form.querySelector('[name="contact[email]"]')?.value || '',
      message: form.querySelector('[name="contact[body]"]')?.value || ''
    };

    try {
      const response = await fetch('/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('Form submitted to webhook:', await response.text());

      // After sending to webhook, submit form normally
      form.submit();
    } catch (err) {
      console.error('Webhook submission error:', err);
      form.submit(); // fallback to normal submission even if webhook fails
    }
  });
}
