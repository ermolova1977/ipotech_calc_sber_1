const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0}).format(Math.round(n || 0)) + ' ₽';
const pct = n => (Math.round(n * 100) / 100).toLocaleString('ru-RU') + '%';

function pmt(rateAnnual, months, principal){
  const r = rateAnnual / 100 / 12;
  if (r === 0) return principal / months;
  return principal * r / (1 - Math.pow(1 + r, -months));
}

function kpDiscount(program, kp){
  const isGov = ['family','it','dvi'].includes(program);
  const isDev = ['dev','base'].includes(program);
  const table = {
    s1_all: isGov ? 1 : isDev ? 2 : 0,
    s1_build: isGov ? 3.8 : isDev ? 6 : 0,
    s2_all: isGov ? 1 : isDev ? 2 : 0,
    s2_build: isGov ? 2 : isDev ? 3.5 : 0
  };
  return table[kp] || 0;
}

function minRate(program, subsidyTerm){
  // ориентиры из презентаций: базовые программы 13,9% на весь срок, 8% до 5 лет, Семейная 3,5%, IT 2,5%, ДВИ 0,6%
  if(program === 'family') return 3.5;
  if(program === 'it') return 2.5;
  if(program === 'dvi') return 0.6;
  if(subsidyTerm === 'all') return 13.9;
  return 8;
}

function calculate(){
  const price = +$('price').value;
  const down = +$('down').value;
  const years = +$('years').value;
  const months = years * 12;
  const buildMonths = +$('buildMonths').value;
  const program = $('program').value;
  const baseRate = +$('baseRate').value;
  const subsidyTerm = $('subsidyTerm').value;
  const subDiscount = subsidyTerm === '0' ? 0 : +$('subsidyDiscount').value;
  const kp = $('kp').value;
  const extraDiscount = +$('extraDiscount').value;
  const loan = Math.max(price - down, 0);
  const promoMonths = subsidyTerm === 'all' ? months : Math.max(+subsidyTerm || 0, kp.includes('build') ? buildMonths : 0);
  const kpDisc = kpDiscount(program, kp);
  const totalDiscount = subDiscount + kpDisc + extraDiscount;
  const limitedRate = Math.max(baseRate - totalDiscount, minRate(program, subsidyTerm));
  const basePayment = pmt(baseRate, months, loan);
  const promoPayment = pmt(limitedRate, months, loan);
  const afterPayment = subsidyTerm === 'all' || kp.includes('all') ? promoPayment : basePayment;
  const baseOver = basePayment * months - loan;
  const newOver = promoPayment * Math.max(promoMonths, 0) + afterPayment * Math.max(months - promoMonths, 0) - loan;
  const benefit = Math.max(baseOver - newOver, 0);
  const commission = subsidyTerm === '0' ? 0 : loan * (+$('commissionRate').value / 100);

  const warnings = [];
  if(down / price < 0.201) warnings.push('Первоначальный взнос ниже 20,1% — проверьте доступность программы.');
  if(kp !== 'none' && buildMonths <= 3) warnings.push('Комплексный продукт применяется, если до окончания строительства более 3 месяцев.');
  if(kp === 's2_all' && buildMonths <= 12) warnings.push('Схема 2 обычно применяется для объектов со сроком ввода более 12 месяцев.');
  if(subsidyTerm !== '0' && kp.includes('build')) warnings.push('Субсидирование сочетается только со схемами КП «на весь срок».');
  if(limitedRate === minRate(program, subsidyTerm) && totalDiscount > 0) warnings.push('Ставка ограничена минимальным значением для выбранной программы.');

  $('dealTitle').textContent = $('dealName').value || 'Расчет';
  $('summary').textContent = `Программа: ${$('program').selectedOptions[0].text}. КП: ${$('kp').selectedOptions[0].text}.`;
  $('loan').textContent = fmt(loan);
  $('promoRate').textContent = pct(limitedRate);
  $('promoPay').textContent = fmt(promoPayment);
  $('benefit').textContent = fmt(benefit);
  $('baseRateOut').textContent = pct(baseRate);
  $('newRateOut').textContent = pct(limitedRate);
  $('basePayOut').textContent = fmt(basePayment);
  $('newPayOut').textContent = fmt(promoPayment);
  $('baseAfterOut').textContent = fmt(basePayment);
  $('newAfterOut').textContent = fmt(afterPayment);
  $('baseOverOut').textContent = fmt(baseOver);
  $('newOverOut').textContent = fmt(newOver);
  $('commissionOut').textContent = fmt(commission);

  $('warnings').style.display = warnings.length ? 'block' : 'none';
  $('warnings').innerHTML = warnings.map(w => `• ${w}`).join('<br>');
}

function copyResult(){
  const text = [
    $('dealTitle').textContent,
    $('summary').textContent,
    'Сумма кредита: ' + $('loan').textContent,
    'Ставка: ' + $('promoRate').textContent,
    'Платеж: ' + $('promoPay').textContent,
    'Выгода клиента: ' + $('benefit').textContent,
    'Комиссия за субсидию: ' + $('commissionOut').textContent
  ].join('\n');
  navigator.clipboard.writeText(text);
  alert('Итог скопирован');
}

function resetForm(){
  document.querySelectorAll('input,select').forEach(el => {
    if(el.id === 'price') el.value = 8000000;
    if(el.id === 'down') el.value = 2000000;
    if(el.id === 'years') el.value = 30;
    if(el.id === 'buildMonths') el.value = 18;
    if(el.id === 'program') el.value = 'dev';
    if(el.id === 'baseRate') el.value = 19.2;
    if(el.id === 'subsidyTerm') el.value = '0';
    if(el.id === 'subsidyDiscount') el.value = 2;
    if(el.id === 'kp') el.value = 'none';
    if(el.id === 'extraDiscount') el.value = 0;
    if(el.id === 'commissionRate') el.value = 0.7;
    if(el.id === 'dealName') el.value = 'Расчет №1';
  });
  calculate();
}

$('calc').addEventListener('click', calculate);
$('copy').addEventListener('click', copyResult);
$('reset').addEventListener('click', resetForm);
$('savePdf').addEventListener('click', () => window.print());
document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', calculate));
calculate();