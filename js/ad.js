/* =========================================
   HELIX Landing Page — app.js
   Firebase Realtime Database 연동
   ========================================= */

(function () {
  'use strict';

  // ── DOM References ──────────────────────
  const form         = document.getElementById('leadForm');
  const submitBtn    = document.getElementById('submitBtn');
  const successMsg   = document.getElementById('successMessage');
  const nameInput    = document.getElementById('name');
  const phoneInput   = document.getElementById('phone');
  const consentInput = document.getElementById('consent');
  const nameError    = document.getElementById('nameError');
  const phoneError   = document.getElementById('phoneError');
  const consentError = document.getElementById('consentError');

  if (!form) return;

  // ── Firebase 참조 (index.html에서 전역 노출됨) ──
  let db, dbRef, dbPush;

  function initFirebase() {
    db      = window.__firebaseDB;
    dbRef   = window.__firebaseRef;
    dbPush  = window.__firebasePush;
  }

  // Firebase 준비 완료 시 초기화
  document.addEventListener('firebase-ready', initFirebase);
  // 이미 로드된 경우 대비
  if (window.__firebaseDB) initFirebase();

  // ── Firebase 저장 함수 ──────────────────
  async function saveToFirebase(data) {
    if (!db || !dbRef || !dbPush) {
      throw new Error('Firebase가 초기화되지 않았습니다. Firebase 설정값을 확인해 주세요.');
    }
    // Firebase Realtime DB: /leads/ 경로에 저장
    const leadsRef = dbRef(db, 'leads');
    await dbPush(leadsRef, data);
  }

  // ── Phone Auto-formatting ────────────────
  phoneInput.addEventListener('input', function () {
    let val = this.value.replace(/\D/g, '');
    if (val.length <= 3) {
      this.value = val;
    } else if (val.length <= 7) {
      this.value = `${val.slice(0, 3)}-${val.slice(3)}`;
    } else {
      this.value = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`;
    }
  });

  // ── Validation ───────────────────────────
  const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;

  function validateName() {
    if (!nameInput.value.trim()) {
      setError(nameInput, nameError, '이름을 입력해 주세요.');
      return false;
    }
    clearError(nameInput, nameError);
    return true;
  }

  function validatePhone() {
    const val = phoneInput.value.trim();
    if (!val) {
      setError(phoneInput, phoneError, '연락처를 입력해 주세요.');
      return false;
    }
    if (!phoneRegex.test(val)) {
      setError(phoneInput, phoneError, '올바른 형식으로 입력해 주세요. (예: 010-1234-5678)');
      return false;
    }
    clearError(phoneInput, phoneError);
    return true;
  }

  function validateConsent() {
    if (!consentInput.checked) {
      consentError.textContent = '개인정보 수집·이용에 동의해 주세요.';
      return false;
    }
    consentError.textContent = '';
    return true;
  }

  function validate() {
    const n = validateName();
    const p = validatePhone();
    const c = validateConsent();
    return n && p && c;
  }

  function setError(input, errorEl, message) {
    input.classList.add('is-error');
    errorEl.textContent = message;
  }

  function clearError(input, errorEl) {
    input.classList.remove('is-error');
    errorEl.textContent = '';
  }

  // ── Real-time Validation on Blur ─────────
  nameInput.addEventListener('blur', validateName);
  phoneInput.addEventListener('blur', validatePhone);
  consentInput.addEventListener('change', validateConsent);

  // ── Form Submit ──────────────────────────
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');

    const payload = {
      name:        nameInput.value.trim(),
      phone:       phoneInput.value.trim(),
      petType:     document.getElementById('petType').value || '미선택',
      inquiry:     document.getElementById('inquiry').value.trim() || '',
      submittedAt: new Date().toISOString(),
      userAgent:   navigator.userAgent,
    };

    try {
      await saveToFirebase(payload);

      // 성공
      form.style.display = 'none';
      successMsg.classList.add('is-visible');
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });

    } catch (err) {
      console.error('Firebase 저장 오류:', err);
      alert('제출 중 오류가 발생했습니다.\n잠시 후 다시 시도해 주세요.');
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
    }
  });

  // ── Scroll Animation ─────────────────────
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.observe').forEach(el => observer.observe(el));

})();
