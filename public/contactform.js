(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('form[action*="/contact"]');
    if (!contactForm) return;

    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(contactForm);
      const payload = {
        first_name: formData.get('contact[name]') || '',
        email: formData.get('contact[email]') || '',
        message: formData.get('contact[body]') || '',
        timestamp: new Date().toISOString(),
        source: 'RapidWeb'
      };

      fetch(window.location.origin + '/hook/send', {
        method: 'POST',
        body: new URLSearchParams(payload)
      })
      .then(response => console.log('✅ Sent to webhook:', payload))
      .catch(err => console.error('❌ Webhook error:', err));

      contactForm.submit();
    });
  });
})();
