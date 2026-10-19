import { activities } from './activities.mjs'
import { createProgressStore } from './progress.mjs'

function initializeLearning() {
  const main = document.querySelector('main')
  if (!main || main.querySelector('.learn-panel')) return

  const language = document.documentElement.lang.toLowerCase().startsWith('zh') ? 'zh' : 'en'
  const text = language === 'zh' ? {
    overview: '边读边练',
    introduction: '读完一节后，改变输入观察结果，再检查理解。',
    progress: (done, total) => `已完成 ${done} / ${total} 个主题`,
    saved: '进度仅保存在当前浏览器中。',
    unsaved: '当前浏览器无法保存进度；本次打开的页面仍可正常练习。',
    start: '开始练习',
    next: '继续练习',
    review: '复习一个主题',
    practice: title => `动手试试：${title}`,
    complete: '已完成',
    read: '回看说明',
    skip: '跳过练习',
    result: '结果',
    unavailable: '请检查输入',
    quiz: '检查理解',
    check: '检查答案',
    choose: '请先选择一个答案。',
    correct: '回答正确。此主题已标记为完成。',
    incorrect: '还不正确，可以修改答案后再试。',
    inputError: '请检查输入：',
    required: label => `请填写“${label}”。`,
    number: label => `“${label}”需要一个有限数值。`,
    minimum: (label, minimum) => `“${label}”不能小于 ${minimum}。`,
    maximum: (label, maximum) => `“${label}”不能大于 ${maximum}。`,
    step: (label, step) => `“${label}”请使用指定的步长 ${step}。`,
    long: label => `“${label}”最多可输入 4000 个字符。`
  } : {
    overview: 'Practice as you read',
    introduction: 'Read a section, change the inputs, then check your understanding.',
    progress: (done, total) => `${done} of ${total} topics complete`,
    saved: 'Progress is saved only in this browser.',
    unsaved: 'This browser cannot save progress. You can still practice during this visit.',
    start: 'Start practicing',
    next: 'Continue practicing',
    review: 'Review a topic',
    practice: title => `Try it: ${title}`,
    complete: 'Completed',
    read: 'Read the explanation',
    skip: 'Skip practice',
    result: 'Result',
    unavailable: 'Check the inputs',
    quiz: 'Check your understanding',
    check: 'Check answer',
    choose: 'Choose an answer first.',
    correct: 'Correct. This topic is marked complete.',
    incorrect: 'Not quite. Change your answer and try again.',
    inputError: 'Check the inputs: ',
    required: label => `Enter a value for ${label}.`,
    number: label => `Enter a finite number for ${label}.`,
    minimum: (label, minimum) => `${label} must be at least ${minimum}.`,
    maximum: (label, maximum) => `${label} must be at most ${maximum}.`,
    step: (label, step) => `Use the specified step of ${step} for ${label}.`,
    long: label => `Keep ${label} to 4000 characters or fewer.`
  }

  const localize = value => typeof value === 'string' ? value : (value?.[language] ?? value?.en ?? '')
  const node = (tag, className, content) => {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (content !== undefined) element.textContent = content
    return element
  }
  const sourceHeadings = Array.from(main.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'))
  const headingIndexes = new Map(sourceHeadings.map((heading, index) => [heading, index]))
  const usedHeadings = new Set()
  const matched = []
  for (const activity of activities) {
    const heading = (activity.headingIds[language] ?? activity.headingIds.en ?? [])
      .map(id => document.getElementById(id))
      .find(candidate => candidate && headingIndexes.has(candidate) && !usedHeadings.has(candidate))
    if (!heading) continue
    usedHeadings.add(heading)
    const level = Number(heading.tagName.slice(1))
    const nextHeading = sourceHeadings.slice(headingIndexes.get(heading) + 1)
      .find(candidate => Number(candidate.tagName.slice(1)) <= level)
    matched.push({ activity, heading, nextHeading, panel: null, status: null })
  }
  matched.sort((left, right) => headingIndexes.get(left.heading) - headingIndexes.get(right.heading))
  if (!matched.length) return

  const progressStore = createProgressStore(activities.map(activity => activity.id))
  const initialProgress = progressStore.read()
  let storageAvailable = initialProgress.available
  const completed = initialProgress.completed

  const overview = node('section', 'learn-overview')
  overview.id = 'learning-progress'
  overview.setAttribute('aria-label', text.overview)
  overview.append(node('p', 'learn-overview__title', text.overview))
  overview.append(node('p', 'learn-overview__description', text.introduction))
  const progressRow = node('div', 'learn-overview__progress')
  const progressLabel = node('span', 'learn-overview__count')
  progressLabel.id = 'learning-progress-count'
  progressLabel.setAttribute('aria-live', 'polite')
  progressLabel.setAttribute('aria-atomic', 'true')
  const progress = node('progress', 'learn-overview__bar')
  progress.max = matched.length
  progress.setAttribute('aria-labelledby', progressLabel.id)
  progressRow.append(progress, progressLabel)
  overview.append(progressRow)
  const overviewFooter = node('div', 'learn-overview__footer')
  const nextPractice = node('a', 'learn-overview__next')
  const storageNote = node('span', 'learn-overview__storage')
  storageNote.setAttribute('role', 'status')
  overviewFooter.append(nextPractice, storageNote)
  overview.append(overviewFooter)

  function enableAnchorFocus(anchor, target) {
    anchor.href = `#${encodeURIComponent(target.id)}`
    anchor.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
      target.focus({ preventScroll: true })
    })
  }

  function syncSidebar() {
    const completionByHeading = new Map(matched.map(item => [item.heading.id, completed.has(item.activity.id)]))
    for (const link of document.querySelectorAll('.section-navigation__link')) {
      let id
      try {
        id = decodeURIComponent(link.hash.slice(1))
      } catch {
        continue
      }
      if (!completionByHeading.has(id)) continue
      const isComplete = completionByHeading.get(id)
      const accessibleStatus = link.querySelector('.learn-navigation-status')
      if (isComplete) {
        link.dataset.complete = 'true'
        if (!accessibleStatus) {
          link.append(node('span', 'learn-navigation-status learn-visually-hidden', ` — ${text.complete}`))
        }
      } else {
        delete link.dataset.complete
        accessibleStatus?.remove()
      }
    }
  }

  function refreshProgress() {
    const done = matched.filter(item => completed.has(item.activity.id)).length
    progress.value = done
    progress.textContent = text.progress(done, matched.length)
    progressLabel.textContent = text.progress(done, matched.length)
    storageNote.textContent = storageAvailable ? text.saved : text.unsaved
    const next = matched.find(item => !completed.has(item.activity.id)) ?? matched[0]
    nextPractice.textContent = done === matched.length ? text.review : done > 0 ? text.next : text.start
    nextPractice.href = `#${encodeURIComponent(next.panel.id)}`
    for (const item of matched) {
      const isComplete = completed.has(item.activity.id)
      item.panel.dataset.complete = String(isComplete)
      item.status.hidden = !isComplete
    }
    syncSidebar()
  }

  function markComplete(id) {
    const state = progressStore.complete(id)
    for (const savedId of state.completed) completed.add(savedId)
    storageAvailable = state.available
    refreshProgress()
  }

  function validationMessage(field, control) {
    const label = localize(field.label)
    if (field.type === 'number' && control.validity.badInput) return text.number(label)
    if (!control.value.trim()) return text.required(label)
    if (control.value.length > 4000) return text.long(label)
    if (field.type !== 'number') return ''
    if (!Number.isFinite(Number(control.value))) return text.number(label)
    if (control.validity.rangeUnderflow) return text.minimum(label, control.min)
    if (control.validity.rangeOverflow) return text.maximum(label, control.max)
    if (control.validity.stepMismatch) return text.step(label, control.step)
    return ''
  }

  function makeCalculator(activity, panelId) {
    const form = node('form', 'learn-calculator')
    form.noValidate = true
    const fields = node('div', 'learn-fields')
    const controls = []
    activity.fields.forEach((field, index) => {
      const wrapper = node('div', 'learn-field')
      const controlId = `${panelId}-field-${index}`
      const label = node('label', 'learn-field__label', localize(field.label))
      label.htmlFor = controlId
      let control
      if (field.type === 'select') {
        control = node('select', 'learn-field__control')
        for (const option of field.options ?? []) {
          const optionNode = node('option', '', localize(option.label))
          optionNode.value = option.value
          control.append(optionNode)
        }
      } else {
        control = node('input', 'learn-field__control')
        control.type = field.type === 'number' ? 'number' : 'text'
        if (field.type === 'number') {
          control.step = field.step === undefined ? 'any' : String(field.step)
          if (field.min !== undefined) control.min = String(field.min)
          if (field.max !== undefined) control.max = String(field.max)
        } else {
          control.maxLength = 4000
          control.spellcheck = false
        }
        control.autocomplete = 'off'
      }
      control.id = controlId
      control.name = field.key
      control.required = true
      control.value = String(field.value)
      wrapper.append(label, control)
      fields.append(wrapper)
      controls.push({ field, control, wrapper })
    })

    const error = node('p', 'learn-error')
    error.id = `${panelId}-input-error`
    error.setAttribute('role', 'alert')
    error.hidden = true
    const expression = node('p', 'learn-expression')
    const expressionCode = node('code')
    expression.append(expressionCode)
    const resultLabel = node('span', 'learn-result-label', text.result)
    resultLabel.id = `${panelId}-result-label`
    const result = node('output', 'learn-result')
    result.setAttribute('aria-live', 'polite')
    result.setAttribute('aria-atomic', 'true')
    result.setAttribute('aria-labelledby', resultLabel.id)
    result.setAttribute('for', controls.map(({ control }) => control.id).join(' '))
    const explanation = node('p', 'learn-calculation-note')
    explanation.hidden = true
    form.append(fields, error, expression, resultLabel, result, explanation)

    const showError = message => {
      error.textContent = message
      error.hidden = false
      expression.hidden = true
      explanation.hidden = true
      result.textContent = text.unavailable
    }
    const calculate = () => {
      error.hidden = true
      const values = Object.fromEntries(controls.map(({ field, control }) => [field.key, control.value]))
      for (const { field, control, wrapper } of controls) {
        const active = !field.activeWhen || field.activeWhen(values)
        control.disabled = !active
        control.required = active
        wrapper.hidden = !active
        control.removeAttribute('aria-invalid')
        control.removeAttribute('aria-describedby')
      }
      const invalid = controls.filter(item => !item.control.disabled).map(item => ({ ...item, message: validationMessage(item.field, item.control) }))
        .find(item => item.message)
      if (invalid) {
        invalid.control.setAttribute('aria-invalid', 'true')
        invalid.control.setAttribute('aria-describedby', error.id)
        showError(invalid.message)
        return
      }
      try {
        const calculated = activity.calculate(values)
        expressionCode.textContent = String(calculated.expression ?? '')
        expression.hidden = !expressionCode.textContent
        result.textContent = String(calculated.result)
        explanation.textContent = localize(calculated.explanation)
        explanation.hidden = !explanation.textContent
      } catch (failure) {
        const message = failure instanceof Error ? failure.message : String(failure)
        for (const { control } of controls) control.setAttribute('aria-describedby', error.id)
        showError(text.inputError + message)
      }
    }
    form.addEventListener('submit', event => {
      event.preventDefault()
      calculate()
    })
    form.addEventListener('input', calculate)
    form.addEventListener('change', calculate)
    calculate()
    return form
  }

  function makeQuiz(activity, panelId) {
    const details = node('details', 'learn-quiz')
    details.append(node('summary', 'learn-quiz__summary', text.quiz))
    const form = node('form', 'learn-quiz__form')
    form.noValidate = true
    const fieldset = node('fieldset', 'learn-quiz__choices')
    fieldset.append(node('legend', 'learn-quiz__prompt', localize(activity.quiz.prompt)))
    const feedback = node('p', 'learn-quiz__feedback')
    feedback.id = `${panelId}-quiz-feedback`
    feedback.setAttribute('role', 'status')
    feedback.setAttribute('aria-live', 'polite')
    feedback.setAttribute('aria-atomic', 'true')
    feedback.hidden = true
    const options = []
    for (const option of activity.quiz.options) {
      const label = node('label', 'learn-choice')
      const radio = node('input', 'learn-choice__input')
      radio.type = 'radio'
      radio.name = `${panelId}-answer`
      radio.value = option.id
      radio.required = true
      radio.setAttribute('aria-describedby', feedback.id)
      label.append(radio, node('span', 'learn-choice__text', localize(option.text)))
      fieldset.append(label)
      options.push(radio)
    }
    const button = node('button', 'learn-quiz__check', text.check)
    button.type = 'submit'
    form.append(fieldset, button, feedback)
    form.addEventListener('submit', event => {
      event.preventDefault()
      const selected = options.find(option => option.checked)
      feedback.hidden = false
      if (!selected) {
        feedback.dataset.state = 'missing'
        feedback.textContent = text.choose
        options[0]?.focus()
        return
      }
      const correct = selected.value === activity.quiz.answer
      feedback.dataset.state = correct ? 'correct' : 'incorrect'
      feedback.textContent = `${correct ? text.correct : text.incorrect} ${localize(activity.quiz.explanation)}`
      if (correct) markComplete(activity.id)
    })
    form.addEventListener('change', () => {
      feedback.hidden = true
      feedback.textContent = ''
    })
    details.append(form)
    return details
  }

  for (const item of matched) {
    const { activity, heading, nextHeading } = item
    const panel = node('section', 'learn-panel')
    panel.id = `practice-${activity.id}`
    panel.dataset.activityId = activity.id
    panel.tabIndex = -1
    const titleRow = node('div', 'learn-panel__header')
    const title = node('p', 'learn-panel__title', text.practice(localize(activity.title)))
    title.id = `${panel.id}-title`
    panel.setAttribute('aria-labelledby', title.id)
    const status = node('span', 'learn-panel__status', text.complete)
    status.hidden = true
    titleRow.append(title, status)
    if (nextHeading) {
      const skip = node('a', 'learn-panel__skip', text.skip)
      enableAnchorFocus(skip, nextHeading)
      titleRow.append(skip)
    }
    panel.append(titleRow, node('p', 'learn-panel__description', localize(activity.description)))
    panel.append(makeCalculator(activity, panel.id), makeQuiz(activity, panel.id))
    const footer = node('div', 'learn-panel__footer')
    const read = node('a', 'learn-panel__read', text.read)
    enableAnchorFocus(read, heading)
    footer.append(read)
    panel.append(footer)
    const sourceBlock = heading.closest('.markdown-heading') ?? heading
    if (nextHeading) (nextHeading.closest('.markdown-heading') ?? nextHeading).before(panel)
    else sourceBlock.parentElement.append(panel)
    item.panel = panel
    item.status = status
  }

  const firstHeading = main.querySelector('h1')
  if (firstHeading) (firstHeading.closest('.markdown-heading') ?? firstHeading).after(overview)
  else main.prepend(overview)
  nextPractice.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = document.getElementById(decodeURIComponent(nextPractice.hash.slice(1)))
    target?.focus({ preventScroll: true })
  })
  window.addEventListener('storage', event => {
    if (!progressStore.isProgressKey(event.key)) return
    const state = progressStore.read()
    for (const id of state.completed) completed.add(id)
    storageAvailable = state.available
    refreshProgress()
  })
  window.addEventListener('load', syncSidebar, { once: true })
  refreshProgress()
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLearning, { once: true })
  } else {
    initializeLearning()
  }
}
