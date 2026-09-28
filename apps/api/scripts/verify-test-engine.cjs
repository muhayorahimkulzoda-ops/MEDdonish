const fs = require('node:fs');
const path = require('node:path');

const base = 'http://localhost:3000/api/v1';

async function req(pathname, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${pathname} ${response.status} ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function main() {
  const login = await req('/admin/auth/login', {
    method: 'POST',
    body: { email: 'admin@meddonish.local', password: 'ChangeMe_Admin1' },
  });
  const token = login.accessToken ?? login.token;

  const preview = await req('/admin/questions/import/preview', {
    method: 'POST',
    token,
    body: {
      questions: [
        {
          type: 'single_choice',
          question: 'ok',
          options: [
            { id: 'A', text: '1' },
            { id: 'B', text: '2' },
          ],
          correct_answer: 'Z',
        },
      ],
    },
  });
  console.log('bad-preview', preview.errors);

  const questions = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../prisma/data/anatomy-questions.json'), 'utf8'),
  );
  const courses = await req('/admin/courses', { token });
  const courseId = courses[0]?.id;
  const confirm = await req('/admin/questions/import/confirm', {
    method: 'POST',
    token,
    body: { questions, language: 'ru', courseId },
  });
  let job;
  for (let i = 0; i < 25; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    job = await req(`/admin/questions/import/${confirm.jobId}`, { token });
    if (job.status === 'done' || job.status === 'failed') break;
  }
  console.log('import', job.status, job.imported);

  const test = await req('/admin/tests', {
    method: 'POST',
    token,
    body: {
      title: 'Osteology 30',
      mode: 'TRAINING',
      questionCount: 30,
      timePerQuestion: 20,
      courseId,
    },
  });
  console.log('test', test.id, 'pool', test.pool.length);

  const bank = await req('/admin/questions', { token });
  const map = new Map(
    bank.map((item) => [
      item.translations[0]?.prompt,
      item.options
        .filter((option) => option.isCorrect)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((option) => option.code),
    ]),
  );

  async function runAttempt(target) {
    const started = await req(`/admin/tests/${test.id}/preview`, { method: 'POST', token });
    let correct = 0;
    let last;
    for (let i = 0; i < 30; i += 1) {
      const question = await req(`/admin/test-attempts/${started.id}/question`, { token });
      if (question.finished) return question;
      const codes = correct < target ? map.get(question.question) ?? [question.options[0].id] : ['__wrong__'];
      last = await req(`/admin/test-attempts/${started.id}/answer`, {
        method: 'POST',
        token,
        body: { selectedCodes: codes, timedOut: false },
      });
      if (last.verdict === 'correct') correct += 1;
      if (last.finished) return last;
    }
    return last;
  }

  for (const target of [14, 15, 28]) {
    const result = await runAttempt(target);
    console.log(`grade-${target}`, {
      correctCount: result.correctCount,
      grade: result.grade,
      passed: result.passed,
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
