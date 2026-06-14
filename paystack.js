// ── FORGECV PAYSTACK INTEGRATION ──

const PAYSTACK_PUBLIC_KEY = 'pk_test_4abde589a7998af488576847432ed331ea89b7ad';
const AMOUNT = 75000; // ₦750 in kobo (Paystack uses kobo)

// ── INITIALIZE PAYMENT ──
async function initializePayment(onSuccess) {
  const user = await getUser();
  if (!user) {
    showToast('Please sign in to continue');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  const profile = await getProfile();
  const email = profile ? profile.email : user.email;

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: AMOUNT,
    currency: 'NGN',
    ref: 'FORGECV_' + Date.now(),
    metadata: {
      user_id: user.id,
      product: 'ForgeCV Pro',
      custom_fields: [
        {
          display_name: 'Product',
          variable_name: 'product',
          value: 'ForgeCV Pro — All Templates'
        }
      ]
    },
    callback: (response) => {
      // Payment successful
      if (response.status === 'success') {
        upgradeToPro().then(() => {
          showToast('Payment successful — Pro unlocked!');
          if (onSuccess) onSuccess();
        });
      }
    },
    onClose: () => {
      showToast('Payment cancelled');
    }
  });

  handler.openIframe();
}

// ── CHECK AND DOWNLOAD ──
// Call this when user clicks download
async function handleProDownload(generatePDFCallback) {
  const user = await getUser();

  // Not logged in
  if (!user) {
    showToast('Please sign in to download');
    setTimeout(() => { window.location.href = 'login.html'; }, 1500);
    return;
  }

  const pro = await isPro();

  if (pro) {
    // Already pro — download directly
    await trackDownload();
    generatePDFCallback();
  } else {
    // Not pro — open payment
    initializePayment(async () => {
      await trackDownload();
      generatePDFCallback();
    });
  }
}
