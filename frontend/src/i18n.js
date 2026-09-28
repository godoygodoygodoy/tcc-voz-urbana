import React, { createContext, useContext, useMemo, useState } from 'react';

const translations = {
  'pt-BR': {
    navHome: 'Início', navHow: 'Como funciona', navMap: 'Mapa', navFeed: 'Feed', navAbout: 'Sobre', navContact: 'Contato',
    login: 'Entrar', logout: 'Sair', account: 'Minha conta', accountSettings: 'Configurações da conta', siteSettings: 'Configurações do site', createProfile: 'Criar novo perfil', createAccount: 'Criar conta',
    language: 'Idioma', portuguese: 'Português (Brasil)', english: 'English', spanish: 'Español',
    liveMap: 'Mapa vivo da cidade', citySpeaks: 'A CIDADE', speaks: 'FALA', amplify: 'Você amplifica',
    heroCopy: 'Reporte buracos, lixo, iluminação, árvores e outros problemas urbanos com mapa interativo, votação comunitária e acompanhamento real.',
    openMap: 'Abrir mapa', exploreMap: 'Explorar mapa', livePanel: 'Painel ao vivo', online: 'Online', cityFocus: 'Cidade em foco', recentCases: 'Ocorrências recentes', live: 'Ao vivo',
    reportProblem: 'Reportar um problema', reportDescription: 'Abra o formulário e envie localização, foto e descrição.', openMapAction: 'Abrir o mapa', mapDescription: 'Veja os pontos já cadastrados e clique nos marcadores.', enterAccount: 'Entrar na conta', accountDescription: 'Acesse o histórico, votos e perfil do usuário.', cityFlow: 'Fluxo da cidade', flowOne: 'Você identifica o problema e envia o local com rapidez.', flowTwo: 'O ponto entra no mapa com categoria e status visual.', flowThree: 'A comunidade vota e acompanha a resolução do caso.',
    feedCases: 'Casos no feed', connectedCities: 'Cidades conectadas', collectiveSupport: 'Apoio coletivo',
    flow: 'Fluxo', howItWorks: 'Como funciona?', howDescription: 'Uma experiência simples: registrar, localizar e acompanhar a melhoria.', takePhoto: 'Tire uma foto', takePhotoDescription: 'Registre o problema com contexto visual para acelerar a triagem.', locateProblem: 'Localize o problema', locateDescription: 'Marque o ponto exato no mapa para facilitar a mobilização.', trackResolution: 'Acompanhe a resolução', trackDescription: 'Veja quando o caso mudar de status e avance no acompanhamento.',
    recentIdentifications: 'Identificações recentes', seeAllMap: 'Ver tudo no mapa', loadingProblems: 'Carregando problemas...', noProblems: 'Nenhum problema encontrado no momento.',
    context: 'Contexto', together: 'JUNTOS, PODEMOS TRANSFORMAR A NOSSA CIDADE', contextDescription: 'A plataforma conecta relato, mapa e acompanhamento em um fluxo direto, sem ruído visual.', quickAccess: 'Acesso rápido', about: 'Sobre', whatIs: 'O que é?', aboutDescription: 'O Voz Urbana é uma plataforma para facilitar a comunicação entre população e órgãos públicos, permitindo denúncias práticas e acompanhamento do status de cada caso.', platformInUse: 'A plataforma em uso', mapLabel: 'Mapa', mapDescriptionShort: 'Marcadores reais com popups, fit bounds e visual escuro.', reports: 'Relatórios', reportsDescription: 'Criação de ocorrências com categoria, localização e acompanhamento.', contactTitle: 'Fale com a Voz Urbana', sendMessage: 'Enviar mensagem', whatsapp: 'WhatsApp', phone: 'Telefone', email: 'E-mail',
    allStatuses: 'Todos os status', allCategories: 'Todas as categorias',
  },
  en: {
    navHome: 'Home', navHow: 'How it works', navMap: 'Map', navFeed: 'Feed', navAbout: 'About', navContact: 'Contact',
    login: 'Log in', logout: 'Log out', account: 'My account', accountSettings: 'Account settings', siteSettings: 'Site settings', createProfile: 'Create new profile', createAccount: 'Create account',
    language: 'Language', portuguese: 'Português (Brasil)', english: 'English', spanish: 'Español',
    liveMap: 'Live city map', citySpeaks: 'THE CITY', speaks: 'SPEAKS', amplify: 'You amplify',
    heroCopy: 'Report potholes, trash, lighting, trees and other urban problems with an interactive map, community voting and real follow-up.',
    openMap: 'Open map', exploreMap: 'Explore map', livePanel: 'Live panel', online: 'Online', cityFocus: 'City focus', recentCases: 'Recent reports', live: 'Live',
    reportProblem: 'Report a problem', reportDescription: 'Open the form and send the location, photo and description.', openMapAction: 'Open the map', mapDescription: 'See registered points and click the markers.', enterAccount: 'Log in', accountDescription: 'Access your history, votes and profile.', cityFlow: 'City flow', flowOne: 'Identify the problem and send its location quickly.', flowTwo: 'The point enters the map with category and visual status.', flowThree: 'The community votes and follows the resolution.',
    feedCases: 'Feed cases', connectedCities: 'Connected cities', collectiveSupport: 'Collective support',
    flow: 'Flow', howItWorks: 'How does it work?', howDescription: 'A simple experience: report, locate and follow improvements.', takePhoto: 'Take a photo', takePhotoDescription: 'Record the problem with visual context to speed up triage.', locateProblem: 'Locate the problem', locateDescription: 'Mark the exact point on the map to mobilize people.', trackResolution: 'Track the resolution', trackDescription: 'See when the case status changes and follow its progress.',
    recentIdentifications: 'Recent reports', seeAllMap: 'See everything on the map', loadingProblems: 'Loading problems...', noProblems: 'No problems found at the moment.',
    context: 'Context', together: 'TOGETHER, WE CAN TRANSFORM OUR CITY', contextDescription: 'The platform connects reports, maps and follow-up in a direct, clear flow.', quickAccess: 'Quick access', about: 'About', whatIs: 'What is it?', aboutDescription: 'Voz Urbana facilitates communication between residents and public agencies through practical reports and status tracking.', platformInUse: 'The platform in use', mapLabel: 'Map', mapDescriptionShort: 'Real markers with popups, fit bounds and a dark visual.', reports: 'Reports', reportsDescription: 'Create reports with category, location and follow-up.', contactTitle: 'Talk to Voz Urbana', sendMessage: 'Send message', whatsapp: 'WhatsApp', phone: 'Phone', email: 'Email',
    allStatuses: 'All statuses', allCategories: 'All categories',
  },
  es: {
    navHome: 'Inicio', navHow: 'Cómo funciona', navMap: 'Mapa', navFeed: 'Feed', navAbout: 'Sobre nosotros', navContact: 'Contacto',
    login: 'Entrar', logout: 'Salir', account: 'Mi cuenta', accountSettings: 'Configuración de la cuenta', siteSettings: 'Configuración del sitio', createProfile: 'Crear nuevo perfil', createAccount: 'Crear cuenta',
    language: 'Idioma', portuguese: 'Português (Brasil)', english: 'English', spanish: 'Español',
    liveMap: 'Mapa vivo de la ciudad', citySpeaks: 'LA CIUDAD', speaks: 'HABLA', amplify: 'Tú amplificas',
    heroCopy: 'Reporta baches, basura, iluminación, árboles y otros problemas urbanos con mapa interactivo, votación comunitaria y seguimiento real.',
    openMap: 'Abrir mapa', exploreMap: 'Explorar mapa', livePanel: 'Panel en vivo', online: 'En línea', cityFocus: 'Ciudad en foco', recentCases: 'Casos recientes', live: 'En vivo',
    reportProblem: 'Reportar un problema', reportDescription: 'Abre el formulario y envía ubicación, foto y descripción.', openMapAction: 'Abrir el mapa', mapDescription: 'Mira los puntos registrados y haz clic en los marcadores.', enterAccount: 'Entrar a la cuenta', accountDescription: 'Accede a tu historial, votos y perfil.', cityFlow: 'Flujo de la ciudad', flowOne: 'Identifica el problema y envía su ubicación rápidamente.', flowTwo: 'El punto entra al mapa con categoría y estado visual.', flowThree: 'La comunidad vota y acompaña la solución.',
    feedCases: 'Casos en el feed', connectedCities: 'Ciudades conectadas', collectiveSupport: 'Apoyo colectivo',
    flow: 'Flujo', howItWorks: '¿Cómo funciona?', howDescription: 'Una experiencia simple: registrar, ubicar y acompañar la mejora.', takePhoto: 'Toma una foto', takePhotoDescription: 'Registra el problema con contexto visual para acelerar la revisión.', locateProblem: 'Ubica el problema', locateDescription: 'Marca el punto exacto en el mapa para facilitar la movilización.', trackResolution: 'Acompaña la solución', trackDescription: 'Mira cuándo cambia el estado y sigue el avance.',
    recentIdentifications: 'Identificaciones recientes', seeAllMap: 'Ver todo en el mapa', loadingProblems: 'Cargando problemas...', noProblems: 'No se encontraron problemas.',
    context: 'Contexto', together: 'JUNTOS, PODEMOS TRANSFORMAR NUESTRA CIUDAD', contextDescription: 'La plataforma conecta reportes, mapa y seguimiento en un flujo directo y claro.', quickAccess: 'Acceso rápido', about: 'Sobre nosotros', whatIs: '¿Qué es?', aboutDescription: 'Voz Urbana facilita la comunicación entre la población y los organismos públicos mediante reportes prácticos y seguimiento de estados.', platformInUse: 'La plataforma en uso', mapLabel: 'Mapa', mapDescriptionShort: 'Marcadores reales con popups y visual oscuro.', reports: 'Reportes', reportsDescription: 'Crea casos con categoría, ubicación y seguimiento.', contactTitle: 'Habla con Voz Urbana', sendMessage: 'Enviar mensaje', whatsapp: 'WhatsApp', phone: 'Teléfono', email: 'Correo electrónico',
    allStatuses: 'Todos los estados', allCategories: 'Todas las categorías',
  },
};

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'pt-BR');
  const value = useMemo(() => ({ language, setLanguage, t: (key) => translations[language]?.[key] || translations['pt-BR'][key] || key }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
