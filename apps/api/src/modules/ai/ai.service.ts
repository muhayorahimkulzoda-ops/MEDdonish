import { Injectable } from '@nestjs/common';

const SYSTEM = `You are MEDdonish AI, a medical-study tutor for medical students (anatomy, physiology, histology, pharmacology, pathophysiology, pathanatomy).
Answer clearly in the student's language (Tajik, Russian, or English).
Use short sections, lists, and Latin terms where useful.
You are not a doctor: do not diagnose or prescribe. End with one sentence that this is for study, not treatment.`;

@Injectable()
export class AiService {
  async ask(question: string, locale = 'tg') {
    const trimmed = question.trim();
    const fromApi = await this.fromApi(trimmed, locale);
    return {
      answer: fromApi ?? this.localAnswer(trimmed, locale),
      source: fromApi ? 'model' : 'tutor',
    };
  }

  private async fromApi(question: string, locale: string): Promise<string | null> {
    const key = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
    if (!key) return null;
    const url = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: `Locale: ${locale}\nQuestion: ${question}` },
          ],
        }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content?.trim();
      return text || null;
    } catch {
      return null;
    }
  }

  private localAnswer(question: string, locale: string) {
    const q = question.toLowerCase();
    const ru = locale.startsWith('ru');
    const en = locale.startsWith('en');
    const topic = this.topic(q, ru, en);
    if (en) {
      return [
        topic,
        '',
        'Study path:',
        '1. Name the structure or process and its Latin term.',
        '2. Describe location, function, and clinical meaning.',
        '3. Compare with nearby structures so you do not mix them in exams.',
        '',
        'This is a study answer, not a diagnosis or treatment advice.',
      ].join('\n');
    }
    if (ru) {
      return [
        topic,
        '',
        'Как учить:',
        '1. Назовите структуру или процесс и латинский термин.',
        '2. Опишите расположение, функцию и клинический смысл.',
        '3. Сравните с соседними структурами, чтобы не путать на экзамене.',
        '',
        'Это учебный ответ, а не диагноз и не назначение лечения.',
      ].join('\n');
    }
    return [
      topic,
      '',
      'Чӣ тавр омӯхтан:',
      '1. Сохтор ё равандро бо истилоҳи лотинӣ номбар кунед.',
      '2. Ҷойгиршавӣ, вазифа ва аҳамияти клиникиро шарҳ диҳед.',
      '3. Бо сохторҳои наздик муқоиса кунед, то дар имтиҳон омехта нашавад.',
      '',
      'Ин ҷавоби таълимӣ аст, на ташхис ва на тавсияи табобат.',
    ].join('\n');
  }

  private topic(q: string, ru: boolean, en: boolean) {
    if (/анатом|anatomy|устухон|кость|bone|скелет/.test(q)) {
      if (en) return 'Anatomy: bones, muscles, vessels and nerves are learned by region and by layer.';
      if (ru) return 'Анатомия: кости, мышцы, сосуды и нервы учат по областям и слоям.';
      return 'Анатомия: устухонҳо, мушакҳо, рагҳо ва асабҳо аз рӯи минтақа ва қабат омӯхта мешаванд.';
    }
    if (/физиолог|physiolog|функсия|функци/.test(q)) {
      if (en) return 'Physiology explains how organs work in the healthy body.';
      if (ru) return 'Физиология объясняет, как органы работают в здоровом организме.';
      return 'Физиология мефаҳмонад, ки узвҳо дар организми солим чӣ гуна кор мекунанд.';
    }
    if (/гистол|histol|бофт|ткан/.test(q)) {
      if (en) return 'Histology is the microscopic study of tissues: epithelium, connective, muscle, nerve.';
      if (ru) return 'Гистология — микроскопия тканей: эпителий, соединительная, мышечная, нервная.';
      return 'Гистология омӯзиши микроскопии бофтҳост: эпителий, пайвандӣ, мушакӣ, асабӣ.';
    }
    if (/фармак|pharmac|дору|препарат|drug/.test(q)) {
      if (en) return 'Pharmacology: for each drug remember class, mechanism, indication, and main side effects.';
      if (ru) return 'Фармакология: для препарата помните класс, механизм, показание и главные побочные эффекты.';
      return 'Фармакология: барои ҳар дору синф, механизм, нишондод ва таъсири тарафро дар ёд доред.';
    }
    if (/патофиз|pathophys|патфиз/.test(q)) {
      if (en) return 'Pathophysiology explains how disease processes change normal function.';
      if (ru) return 'Патофизиология объясняет, как болезнь меняет нормальную функцию.';
      return 'Патофизиология мефаҳмонад, ки беморӣ функсияи муқаррариро чӣ гуна тағйир медиҳад.';
    }
    if (/патанат|pathanat|патолог.*анатом/.test(q)) {
      if (en) return 'Pathological anatomy describes structural changes of organs in disease.';
      if (ru) return 'Патанатомия описывает структурные изменения органов при болезни.';
      return 'Патанатомия тағйироти сохтории узвҳоро ҳангоми беморӣ тасвир мекунад.';
    }
    if (en) return `On your question (“${q.slice(0, 180)}”): start from definition, then mechanism, then clinical meaning.`;
    if (ru) return `По вашему вопросу («${q.slice(0, 180)}»): начните с определения, затем механизм, затем клинический смысл.`;
    return `Оид ба саволи шумо («${q.slice(0, 180)}»): аввал таъриф, баъд механизм, баъд аҳамияти клиникӣ.`;
  }
}
