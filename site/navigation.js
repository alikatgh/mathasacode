(() => {
  'use strict';

  const main = document.querySelector('main');
  if (!main || document.querySelector('.section-navigation')) return;

  const allHeadings = Array.from(main.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]'));
  const isContents = (heading) => /^(?:contents|table of contents|目录)$/i.test(heading.textContent.trim());
  const headings = allHeadings.filter((heading) => !isContents(heading));
  if (headings.length === 0) return;

  const isChinese = document.documentElement.lang.toLowerCase().startsWith('zh');
  const title = isChinese ? '章节导航' : 'Sections';
  const decodeHash = (hash) => {
    const value = hash.replace(/^#/, '');
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const contentsBlocks = allHeadings.filter(isContents).map((heading) => {
    const wrapper = heading.closest('.markdown-heading') || heading;
    const next = wrapper.nextElementSibling;
    return { wrapper, list: next && next.tagName === 'UL' ? next : null };
  });
  const contentsLabels = new Map();
  for (const { list } of contentsBlocks) {
    if (!list) continue;
    for (const anchor of list.querySelectorAll('a[href^="#"]')) {
      const id = decodeHash(anchor.getAttribute('href'));
      const label = anchor.textContent.replace(/\s+/g, ' ').trim();
      if (label && !contentsLabels.has(id)) contentsLabels.set(id, label);
    }
  }

  const aside = document.createElement('aside');
  aside.className = 'section-navigation';
  aside.setAttribute('aria-label', title);

  const heading = document.createElement('h2');
  heading.className = 'section-navigation__title';
  heading.id = 'section-navigation-title';
  heading.textContent = title;

  const toggle = document.createElement('button');
  toggle.className = 'section-navigation__toggle';
  toggle.type = 'button';
  toggle.textContent = title;
  toggle.setAttribute('aria-controls', 'section-navigation-links');
  toggle.setAttribute('aria-expanded', 'false');

  const navigation = document.createElement('nav');
  navigation.className = 'section-navigation__links';
  navigation.id = 'section-navigation-links';
  navigation.setAttribute('aria-label', title);

  const rootList = document.createElement('ul');
  rootList.className = 'section-navigation__list';
  navigation.append(rootList);
  aside.append(heading, toggle, navigation);

  const links = new Map();
  const stack = [];
  for (const section of headings) {
    // The guide's introductory h1s are peers of its main h2 sections.
    // Missing heading levels still nest directly under the nearest parent.
    const level = Math.max(2, Number(section.tagName.slice(1)));
    while (stack.length && stack[stack.length - 1].level >= level) stack.pop();

    let list = rootList;
    if (stack.length) {
      const parent = stack[stack.length - 1];
      if (!parent.children) {
        parent.children = document.createElement('ul');
        parent.children.className = 'section-navigation__list';
        parent.item.append(parent.children);
      }
      list = parent.children;
    }

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'section-navigation__link';
    link.href = `#${encodeURIComponent(section.id)}`;
    link.textContent = section === headings[0] && section.tagName === 'H1'
      ? (isChinese ? '概览' : 'Overview')
      : contentsLabels.get(section.id) || section.textContent.replace(/\s+/g, ' ').trim();
    link.dataset.label = link.textContent;
    item.append(link);
    list.append(item);
    links.set(section.id, link);
    stack.push({ level, item, children: null });
  }

  main.before(aside);
  document.body.classList.add('has-section-navigation');

  // Hide an inline table only after every one of its destinations is available.
  for (const { wrapper, list } of contentsBlocks) {
    if (!list) continue;
    const anchors = Array.from(list.querySelectorAll('a[href^="#"]'));
    if (anchors.length && anchors.every((anchor) => links.has(decodeHash(anchor.getAttribute('href'))))) {
      wrapper.hidden = true;
      list.hidden = true;
    }
  }

  const compact = window.matchMedia('(max-width: 900px)');
  let menuOpen = false;
  let activeLink = null;

  const revealActiveLink = () => {
    if (!activeLink || navigation.hidden) return;
    const panel = navigation.getBoundingClientRect();
    const active = activeLink.getBoundingClientRect();
    if (active.top < panel.top + 8) {
      navigation.scrollTop += active.top - panel.top - 8;
    } else if (active.bottom > panel.bottom - 8) {
      navigation.scrollTop += active.bottom - panel.bottom + 8;
    }
  };

  const setMenuOpen = (open) => {
    menuOpen = open;
    const expanded = !compact.matches || menuOpen;
    toggle.setAttribute('aria-expanded', String(expanded));
    navigation.hidden = !expanded;
    if (expanded) revealActiveLink();
  };

  const setActive = (id) => {
    const link = links.get(id);
    if (!link || link === activeLink) return;
    if (activeLink) activeLink.removeAttribute('aria-current');
    activeLink = link;
    activeLink.setAttribute('aria-current', 'location');
    toggle.setAttribute('aria-label', `${title}: ${link.dataset.label}`);
    revealActiveLink();
  };

  const updateFromHash = () => {
    const id = decodeHash(window.location.hash);
    if (links.has(id)) setActive(id);
  };

  // A reading page can use its own hash (including a practice deep link).
  // The reader resolves that route back to its original source heading.
  document.addEventListener('reader:change', (event) => {
    setActive(event.detail.topicId);
  });

  toggle.addEventListener('click', () => setMenuOpen(!menuOpen));
  aside.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && compact.matches && menuOpen) {
      toggle.focus();
      setMenuOpen(false);
    }
  });
  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a.section-navigation__link');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = decodeHash(link.hash);
    setActive(id);
    if (compact.matches) {
      setMenuOpen(false);
      const target = document.getElementById(id);
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    }
  });
  compact.addEventListener('change', () => {
    if (compact.matches && navigation.contains(document.activeElement)) toggle.focus();
    setMenuOpen(false);
  });
  window.addEventListener('hashchange', updateFromHash);
  window.addEventListener('popstate', updateFromHash);
  window.addEventListener('load', updateFromHash, { once: true });

  setMenuOpen(false);
  setActive(headings[0].id);
  updateFromHash();
})();
