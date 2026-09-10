// Все тексты ролика в одном месте: русская и английская версии.
export type Copy = typeof ru;

export const ru = {
  hook: ['Непонятный анализ —', 'это тревожно'],
  calendarCap: ['Почерк из рецепта —', 'в понятное расписание'],
  avatarCap: ['Показывает простым языком,', 'где что-то не так'],
  familyCap: ['Здоровье родителей —', 'под спокойным контролем'],
  ctaSub: 'Пойми своё здоровье',

  analysis: {
    hb: 'Гемоглобин',
    hbRef: '120 – 150 г/л · норма',
    glucose: 'Глюкоза',
    glucoseRef: 'норма 3,9 – 5,9 ммоль/л',
    notDiabetesPre: 'Это ',
    notDiabetes: 'не диабет',
    notDiabetesPost: '. Чаще всего — если кровь сдавали не натощак.',
    analysisNote: 'Пересдать утром натощак. Показать терапевту на плановом приёме.',
    lymph: 'Лимфоциты',
    lymphRef: '19 – 37 % · норма',
  },
  calendar: {
    byRx: 'По рецепту',
    drug: 'Метформин 500 мг',
    dose: 'утром и вечером, после еды · 10 дней',
    days: ['Пн', 'Вт', 'Ср', 'Чт'],
  },
  family: {
    people: 'Близкие',
    mom: 'Мама',
    connected: 'подключена',
    addRelative: '+ Добавить близкого',
    today: 'Сегодня',
    allNormal: 'Всё в норме',
    lastTest: 'последний анализ — 12 сентября',
    reminderDrug: 'Метформин, после еды',
  },
  avatarLabel: 'Правое плечо · требует внимания',
};

export const en: Copy = {
  hook: ["A result you can't read", 'is stressful'],
  calendarCap: ['A prescription scrawl —', 'into a clear schedule'],
  avatarCap: ['Plain words for', 'what looks off'],
  familyCap: ["Your parents' health —", 'calmly in view'],
  ctaSub: 'Understand your health',

  analysis: {
    hb: 'Hemoglobin',
    hbRef: '120 – 150 g/L · normal',
    glucose: 'Glucose',
    glucoseRef: 'normal 3.9 – 5.9 mmol/L',
    notDiabetesPre: "This is ",
    notDiabetes: 'not diabetes',
    notDiabetesPost: '. Usually just a non-fasting sample.',
    analysisNote: 'Retest fasting in the morning. Show it to your GP at the next visit.',
    lymph: 'Lymphocytes',
    lymphRef: '19 – 37 % · normal',
  },
  calendar: {
    byRx: 'From the prescription',
    drug: 'Metformin 500 mg',
    dose: 'morning and evening, after food · 10 days',
    days: ['Mon', 'Tue', 'Wed', 'Thu'],
  },
  family: {
    people: 'Family',
    mom: 'Mom',
    connected: 'connected',
    addRelative: '+ Add a family member',
    today: 'Today',
    allNormal: 'All normal',
    lastTest: 'last test — Sep 12',
    reminderDrug: 'Metformin, after food',
  },
  avatarLabel: 'Right shoulder · needs attention',
};
