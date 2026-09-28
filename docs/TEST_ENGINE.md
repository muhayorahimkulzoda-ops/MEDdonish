# Движок тестирования

## Банк вопросов

Вопрос не принадлежит одному тесту. Связи `discipline_id` / `course_id` / `section_id` / `lesson_id` могут быть null.

Типы: `SINGLE_CHOICE`, `TRUE_FALSE`, `MATCHING`, `ORDERING`, `IMAGE_SINGLE_CHOICE`.

## JSON-импорт

```text
upload → schema validation → ошибки с номером вопроса → preview → confirm → DB
```

Пример ошибки: `Question 487: correct_answer does not exist`.

Импорт 100–1000+ вопросов идёт через очередь, не в HTTP-процессе API.

## Генерация попытки

```text
pool → exclude disabled → снизить повтор last_attempt_questions
→ выбрать question_count (по умолчанию 30) → перемешать ответы
→ immutable test_attempt + test_attempt_questions
```

Новая попытка — новый набор.

## Таймер

20 секунд на **выбор ответа**. `timeout` = неверно. Пауза с показом правильного ответа не уменьшает таймер следующего вопроса.

## Режимы

- **Training** — сразу вердикт, правильный ответ, explanation.
- **Exam** — разбор после `finish`.

## Оценивание

Настройки, не константы UI. Для 30 вопросов по умолчанию:

- 28–30 → 5
- 24–27 → 4
- 15–23 → 3
- 0–14 → «Вы плохо сдали тест»

Расчёт оценки — функция `@meddonish/shared-types` (`gradeAttempt`), чтобы web, admin и API не расходились.
