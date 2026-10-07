%% stp.cls -- класс документа, реализующий требования СТП БГУИР
%% Вся геометрия, шрифты, интервалы и форматы подписей заданы здесь.
%% Не переопределяйте эти параметры в преамбуле документа.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{stp}[2026/09/05 STP BGUIR document class]

\DeclareOption*{\PassOptionsToClass{\CurrentOption}{extarticle}}
\ProcessOptions\relax
\LoadClass[14pt,a4paper,oneside]{extarticle}

%% ------------------------------------------------------------------ шрифты
\RequirePackage{fontspec}
\RequirePackage{unicode-math}
%% СТП допускает только Times New Roman — подмены шрифта нет
\IfFontExistsTF{Times New Roman}
  {\setmainfont{Times New Roman}}
  {\ClassError{stp}{Шрифт Times New Roman не найден в системе}%
    {СТП 2.1.1 допускает только Times New Roman. Установите шрифт в систему.}}
%% математический шрифт, метрически близкий к Times
\IfFontExistsTF{texgyretermes-math.otf}
  {\setmathfont{texgyretermes-math.otf}}
  {\ClassWarning{stp}{TeX Gyre Termes Math not found, using default math font}}

\RequirePackage{polyglossia}
\setmainlanguage{russian}
\setotherlanguage{english}

%% кегль 14 пт, межстрочный интервал ровно 18 пт (СТП 2.1.1).
%% Единица bp (1/72 дюйма) — это «пункт» в смысле СТП и Word; TeX-пункт равен
%% 1/72,27 дюйма, поэтому 18pt дают в PDF только 17,93 пункта.
\renewcommand\normalsize{%
  \@setfontsize\normalsize{14bp}{18bp}%
  \abovedisplayskip 18bp \@plus2\p@ \@minus5\p@
  \abovedisplayshortskip \z@ \@plus3\p@
  \belowdisplayshortskip 9\p@ \@plus3\p@ \@minus3\p@
  \belowdisplayskip \abovedisplayskip}
\normalsize

%% ------------------------------------------------------------- геометрия
\RequirePackage[a4paper,left=30mm,right=15mm,top=20mm,bottom=20mm,
                footskip=10mm,headsep=0pt,headheight=0pt]{geometry}
\setlength{\parindent}{1.25cm}
\setlength{\parskip}{0pt}
%% умеренная терпимость: TeX предпочитает перенос растягиванию пробелов
\pretolerance=-1
\tolerance=3000
\setlength{\emergencystretch}{1.5em}
\frenchspacing

%% висячие строки: одиночную строку абзаца не оставляют внизу и не переносят
%% наверх страницы; заголовок без последующего текста на страницу не ставят
\clubpenalty=10000
\widowpenalty=10000
\displaywidowpenalty=10000
\RequirePackage{indentfirst}
\RequirePackage{amsmath} % amssymb несовместим с unicode-math; символы даёт unicode-math
\RequirePackage{graphicx}
\RequirePackage{calc}
\RequirePackage{tabularx}
\RequirePackage{longtable}
\RequirePackage{array}
\RequirePackage{enumitem}
\RequirePackage{titlesec}
\RequirePackage{needspace}
\RequirePackage{etoolbox}
\RequirePackage{tocloft}
\RequirePackage{caption}
\RequirePackage{fancyhdr}
\RequirePackage{float}
\RequirePackage[hidelinks]{hyperref}

%% ------------------------------------------------- колонтитул и нумерация
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[R]{\thepage}
\fancypagestyle{stpempty}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}}
%% plain используется на страницах с \tableofcontents — номер тоже справа внизу
\fancypagestyle{plain}{\fancyhf{}\renewcommand{\headrulewidth}{0pt}\fancyfoot[R]{\thepage}}
%% страница без номера, но входящая в общую нумерацию (СТП 2.2.8)
\newcommand{\stpnonumber}{\thispagestyle{stpempty}}

%% ---------------------------------------------------------- заголовки
\newcommand{\stpnohyphen}{\hyphenpenalty=10000\exhyphenpenalty=10000\relax}
%% ragged right, не трогая \leftskip (\raggedright обнулил бы отступ заголовка)
\newcommand{\stpragged}{\rightskip=0pt plus 1fil\relax}

%% Заголовок верхнего уровня — прописными полужирным, кегль 14 пт.
%% СТП кегль заголовков разделов не задаёт (для СОДЕРЖАНИЕ допускает 14–16);
%% методичка по курсовому проектированию требует 16, но на кафедре принят 14.
%% Менять размер здесь — он общий для разделов, ненумерованных разделов,
%% приложений и заголовка содержания.
\newcommand{\stpheadsize}{\fontsize{14bp}{18bp}\selectfont}
%% Отбивка после заголовка — штатная (titlespacing). Перед заголовком её ставит
%% \stp@beforehead, и только если её ещё нет: выше может стоять рисунок или
%% таблица со своей отбивкой, а после другого заголовка titlesec добавит свою
%% сам (этот случай ловится флагом \if@nobreak). Без проверок отбивки
%% складывались бы в две пробельные строки вместо одной.
\titleformat{\section}[hang]
  {\normalfont\bfseries\stpheadsize\stpnohyphen\stpragged}{\thesection}{0.5em}
  {\MakeUppercase}
\titlespacing*{\section}{1.25cm}{0pt}{18bp}

\titleformat{\subsection}[hang]
  {\normalfont\bfseries\stpnohyphen\stpragged}{\thesubsection}{0.5em}{}
%% Отступ перед заголовком задаётся не через titlesec, а \addvspace: если выше
%% стоит рисунок или таблица со своей отбивкой, они схлопываются в одну
%% пробельную строку вместо двух.
\titlespacing*{\subsection}{1.25cm}{0pt}{18bp}
%% заголовок подраздела не остаётся внизу страницы: после него должно
%% помещаться не менее трёх строк текста, иначе заголовок уходит на новый лист
%% Пробельная строка перед заголовком добавляется, только если её ещё нет.
%% Выше может стоять рисунок, таблица или другой заголовок со своей отбивкой —
%% без этой проверки отбивки складывались бы в две пробельные строки.
%% Флаг «блок уже отбился снизу сам»: его взводят рисунок, таблица и листинг,
%% а сбрасывает начало любого абзаца. По \lastskip это не определить — после
%% отбивки остаётся penalty-узел, и \lastskip читается нулём.
\newif\ifstp@spaced
\AddToHook{para/begin}{\global\stp@spacedfalse}

\newcommand{\stp@beforehead}{\par
  \if@nobreak\else        % сразу после другого заголовка titlesec отобьёт сам
    \ifstp@spaced\else \vspace{18bp}\fi
  \fi
  \global\stp@spacedfalse
  \Needspace*{6\baselineskip}}
\pretocmd{\subsection}{\stp@beforehead}{}{}
\pretocmd{\subsubsection}{\stp@beforehead}{}{}

\titleformat{\subsubsection}[hang]
  {\normalfont\bfseries\stpnohyphen\stpragged}{\thesubsubsection}{0.5em}{}
\titlespacing*{\subsubsection}{1.25cm}{0pt}{18bp}

%% номера разделов без точки в конце
\renewcommand{\thesection}{\arabic{section}}
\renewcommand{\thesubsection}{\thesection.\arabic{subsection}}
\renewcommand{\thesubsubsection}{\thesubsection.\arabic{subsubsection}}
\setcounter{secnumdepth}{3}

%% каждый раздел с новой страницы (СТП 2.2.6)
\newcommand{\sectionbreak}{\clearpage}

%% ненумерованный раздел: по центру, полужирным, прописными (СТП 2.1.1)
%% #1 пишется в обычном регистре («Введение»): заголовок печатается прописными,
%% а в содержание по СТП 2.2.7 строка идёт строчными с первой прописной
\newcommand{\stpunnumbered}[1]{%
  \clearpage
  \phantomsection
  \begingroup
    \centering\normalfont\bfseries\stpheadsize\stpnohyphen
    \MakeUppercase{#1}\par
  \endgroup
  \addcontentsline{toc}{section}{#1}%
  \par\addvspace{18bp}\par\ignorespaces}

%% ------------------------------------------------------------ содержание
\renewcommand{\cfttoctitlefont}{\hfill\normalfont\bfseries\stpheadsize}
%% ширина под номер — по самому номеру плюс пробел, чтобы заголовок шёл сразу
%% за номером, как в образце СТП 2.2.7 («1 Анализ…», «1.1 Анализ исходных…»)
\setlength{\cftsecnumwidth}{1.1em}
\setlength{\cftsubsecnumwidth}{1.9em}
\setlength{\cftsubsubsecnumwidth}{2.7em}
\renewcommand{\cftaftertoctitle}{\hfill}

\setlength{\cftbeforetoctitleskip}{0pt}
\setlength{\cftaftertoctitleskip}{18pt}
\renewcommand{\cftsecfont}{\normalfont}
\renewcommand{\cftsubsecfont}{\normalfont}
\renewcommand{\cftsubsubsecfont}{\normalfont}
\renewcommand{\cftsecpagefont}{\normalfont}
\renewcommand{\cftsecleader}{\cftdotfill{\cftdotsep}}
%% плотное отточие, как в образце СТП 2.2.7
\renewcommand{\cftdotsep}{1}
\renewcommand{\cftsecdotsep}{\cftdotsep}
\renewcommand{\cftsubsecdotsep}{\cftdotsep}
\renewcommand{\cftsubsubsecdotsep}{\cftdotsep}
\setlength{\cftsecindent}{0pt}
\setlength{\cftsubsecindent}{2ex}
\setlength{\cftsubsubsecindent}{4ex}
\setlength{\cftbeforesecskip}{0pt}
\setlength{\cftbeforesubsecskip}{0pt}
\newcommand{\stptoc}{\clearpage
  \renewcommand{\contentsname}{СОДЕРЖАНИЕ}%
  \tableofcontents\clearpage}

%% ------------------------------------------------- подписи рисунков/таблиц
%% рисунок/таблица отделяются от текста одной пробельной строкой
\setlength{\intextsep}{18bp}
\setlength{\textfloatsep}{18bp}
\DeclareCaptionLabelSeparator{stpdash}{~--~}
\captionsetup{font={normalsize},labelsep=stpdash,skip=18bp}
\captionsetup[figure]{justification=centering,singlelinecheck=true,
                      position=below,name=Рисунок}
%% заголовок таблицы: пробельной строки между ним и таблицей нет (методичка,
%% п. 1.52); вторая строка выравнивается по началу текста заголовка (п. 1.47)
\captionsetup[table]{justification=raggedright,singlelinecheck=false,
                     position=above,name=Таблица,skip=2bp,format=hang}

%% polyglossia для русского задаёт \figurename = «Рис.»; СТП 2.5.5 требует
%% слово «Рисунок» без сокращения. Переопределяем после загрузки языка.
\AtBeginDocument{%
  \gappto\captionsrussian{%
    \renewcommand{\figurename}{Рисунок}%
    \renewcommand{\tablename}{Таблица}}%
  \renewcommand{\figurename}{Рисунок}%
  \renewcommand{\tablename}{Таблица}}

%% нумерация по разделам (СТП 2.4.6, 2.5.5, 2.6.2)
\counterwithin{figure}{section}
\counterwithin{table}{section}
\counterwithin{equation}{section}

%% Рисунок и таблица отбиваются от текста одной пробельной строкой сверху и
%% снизу (СТП 2.5.3, методичка п. 1.51-1.52). Отбивка задаётся \addvspace, а не
%% \vskip: если следом идёт заголовок со своим отступом, они схлопываются в одну
%% пробельную строку, а не складываются в две.
%% \@captype объявляет тип объекта, поэтому \caption работает вне float
\newenvironment{stpfigure}[1][H]
  {\par\removelastskip\addvspace{18bp}\def\@captype{figure}%
   \noindent\begin{minipage}{\textwidth}\centering}
  {\end{minipage}\par\addvspace{18bp}\global\stp@spacedtrue}

%% таблица: заголовок и левая граница таблицы на уровне левого поля (СТП 2.6.2)
\newenvironment{stptable}[1][H]
  {\par\removelastskip\addvspace{18bp}\def\@captype{table}%
   \noindent\begin{minipage}{\textwidth}%
   %% вне float caption не подхватывает глобальные настройки — задаём локально
   \captionsetup{justification=raggedright,singlelinecheck=false,format=hang}%
   \setlength{\parindent}{0pt}\raggedright}
  {\end{minipage}\par\addvspace{18bp}\global\stp@spacedtrue}

%% \stpimage[ширина]{файл}{подпись}{метка} — рисунок с подписью (СТП 2.5.3, 2.5.5)
%% Ширина задаётся только по горизонтали: масштаб всегда пропорциональный.
%% Подпись свёрстана в блок шириной с рисунок, поэтому не выходит за его
%% границы (СТП 2.5.5: «длина строк не должна выходить за границы рисунка»).
\newcommand{\stpimage}[4][150mm]{%
  \begin{stpfigure}
    \begin{minipage}{#1}
      \centering
      %% вне float caption не подхватывает глобальные настройки — задаём локально
      \captionsetup{justification=centering,singlelinecheck=false}%
      \includegraphics[width=\linewidth]{#2}
      \caption{#3}\label{#4}
    \end{minipage}
  \end{stpfigure}}

%% ---------- таблица с переносом на следующие страницы (СТП 2.6.4, 2.6.7)
%% Класс сам печатает «Продолжение таблицы N» и повторяет головку (или строку
%% с номерами граф, если головка длинная). Считать и дублировать вручную ничего
%% не нужно.
\def\stplt@cols{}\def\stplt@cap{}\def\stplt@lbl{}\def\stplt@head{}
\def\stplt@n{}\newif\ifstplt@num

\define@key{stplt}{колонки}{\def\stplt@cols{#1}}
\define@key{stplt}{подпись}{\def\stplt@cap{#1}}
\define@key{stplt}{метка}{\def\stplt@lbl{#1}}
\define@key{stplt}{головка}{\def\stplt@head{#1}}
\define@key{stplt}{граф}{\def\stplt@n{#1}}
\define@key{stplt}{нумерация}{\stplt@numtrue}

%% строка «1 & 2 & … & n» собирается заранее: раскрывать цикл внутри
%% выключки нельзя, символ & должен попасть в неё готовым
\newcommand{\stplt@buildnum}{%
  \def\stplt@numrow{}%
  \count@=\z@
  \loop\advance\count@\@ne
    \ifnum\count@=\@ne
      \edef\stplt@numrow{\the\count@}%
    \else
      \edef\stplt@numrow{\stplt@numrow\noexpand&\the\count@}%
    \fi
  \ifnum\count@<\stplt@n\repeat}

\newenvironment{stplongtable}[1]
  {\par\removelastskip\addvspace{18bp}%
   \stplt@numfalse
   \setkeys{stplt}{#1}%
   \stp@require{\stplt@cols}{колонки}%
   \stp@require{\stplt@cap}{подпись}%
   \stp@require{\stplt@lbl}{метка}%
   \stp@require{\stplt@head}{головка}%
   \stp@require{\stplt@n}{граф}%
   \stplt@buildnum
   \captionsetup{justification=raggedright,singlelinecheck=false,format=hang}%
   \setlength{\LTleft}{0pt}\setlength{\LTright}{\fill}%
   \setlength{\LTcapwidth}{\textwidth}%
   \setlength{\parindent}{0pt}%
   \expandafter\longtable\expandafter{\stplt@cols}
     \caption{\stplt@cap}\label{\stplt@lbl}\\
     \hline \stplt@head \\ \hline
     \ifstplt@num \stplt@numrow \\ \hline \fi
     \endfirsthead
     \multicolumn{\stplt@n}{l}{Продолжение таблицы~\ref{\stplt@lbl}}\\
     \hline
     \ifstplt@num \stplt@numrow \\ \hline
     \else \stplt@head \\ \hline \fi
     \endhead}
  {\endlongtable\addvspace{18bp}\global\stp@spacedtrue}

%% ------------------------------------------------------------ листинги кода
%% Фрагмент программного кода: тот же Times New Roman 14 пт, курсивом, так как
%% текст латинский (СТП 2.3.1, 2.4.2); от левого поля без абзацного отступа,
%% пробелы и переносы строк сохраняются, интервал одинарный.
\RequirePackage{fancyvrb}
\newenvironment{stplisting}
  {\par\removelastskip\topsep=\z@\partopsep=\z@\parskip=\z@
   \vspace{8bp}%
   \VerbatimEnvironment
   \begin{Verbatim}[fontfamily=\rmdefault,fontshape=it,%
                    fontsize=\fontsize{14bp}{16bp}\selectfont,%
                    xleftmargin=0pt,samepage=false]}
  {\end{Verbatim}\vspace{6bp}\global\stp@spacedtrue\par}

%% ------------------------------------------------------------ перечисления
%% Во всех перечислениях метка стоит ровно на абзацном отступе (1,25 см),
%% продолжение строки — от левого поля.
%% простое перечисление: тире, элементы через «;» (СТП 2.3.5)
\newlist{stpdash}{itemize}{2}
\setlist[stpdash]{label={--\hspace{0.5em}},itemindent=1.25cm,align=left,
                  leftmargin=0pt,labelwidth=0pt,labelsep=0pt,
                  topsep=0pt,partopsep=0pt,parsep=0pt,itemsep=0pt,nosep}
%% сложное перечисление: «1 Текст.» (СТП 2.3.7)
\newlist{stpnum}{enumerate}{2}
\setlist[stpnum]{label={\arabic*\hspace{0.5em}},itemindent=1.25cm,align=left,
                 leftmargin=0pt,labelwidth=0pt,labelsep=0pt,
                 topsep=0pt,partopsep=0pt,parsep=0pt,itemsep=0pt,nosep}
%% перечисление со ссылками: «а) …», вложенное — «1)» с отступом 25 мм (СТП 2.3.8)
%% строчные русские буквы без ё з й о ч ъ ы ь
\newcommand{\stpasbuk}[1]{%
  \ifcase\csname c@#1\endcsname\or а\or б\or в\or г\or д\or е\or ж\or и\or к\or л\or
  м\or н\or п\or р\or с\or т\or у\or ф\or х\or ц\or ш\or щ\or э\or ю\or я\fi}
\newlist{stpalph}{enumerate}{2}
\setlist[stpalph,1]{label={\protect\stpasbuk{stpalphi})\hspace{0.5em}},
                    ref={\protect\stpasbuk{stpalphi}},itemindent=1.25cm,align=left,
                    leftmargin=0pt,labelwidth=0pt,labelsep=0pt,
                    topsep=0pt,partopsep=0pt,parsep=0pt,itemsep=0pt,nosep}
\setlist[stpalph,2]{label={\arabic*)\hspace{0.5em}},itemindent=25mm,align=left,
                    leftmargin=0pt,labelwidth=0pt,labelsep=0pt,
                    topsep=0pt,partopsep=0pt,parsep=0pt,itemsep=0pt,nosep}


%% ------------------------------------------------------ расшифровка формул
%% «где» с новой строки без абзацного отступа, символы выровнены,
%% отделены знаком тире, каждая расшифровка через «;» (СТП 2.4.7)
\newlength{\stp@wherelen}
\newif\ifstp@wherefirst
\newenvironment{stpwhere}
  {\par\nobreak\settowidth{\stp@wherelen}{где~}%
   \begingroup\setlength{\parindent}{0pt}\stp@wherefirsttrue}
  {\endgroup\par}
%% #1 — символ (в математическом режиме), #2 — расшифровка с «;» или «.» в конце
\newcommand{\stpsym}[2]{%
  \par\noindent
  \ifstp@wherefirst где~\stp@wherefirstfalse
  \else\hspace*{\stp@wherelen}\fi
  \hangindent=\stp@wherelen\hangafter=1
  $#1$~--~#2\par}

%% ---------------------------------------------------------- приложения
%% буквы русского алфавита без Ё З Й О Ч Ъ Ы Ь (СТП 2.7.2)
\newcounter{stpappendix}
\newcommand{\stpappletter}[1]{%
  \ifcase#1\or А\or Б\or В\or Г\or Д\or Е\or Ж\or И\or К\or Л\or М\or Н\or
  П\or Р\or С\or Т\or У\or Ф\or Х\or Ц\or Ш\or Щ\or Э\or Ю\or Я\fi}
\newcommand{\thestpappletter}{\stpappletter{\value{stpappendix}}}

\newcommand{\stpappendices}{%
  \clearpage
  \setcounter{stpappendix}{0}%
  \renewcommand{\thefigure}{\thestpappletter.\arabic{figure}}%
  \renewcommand{\thetable}{\thestpappletter.\arabic{table}}%
  \renewcommand{\theequation}{\thestpappletter.\arabic{equation}}%
  \counterwithin*{figure}{stpappendix}%
  \counterwithin*{table}{stpappendix}%
  \counterwithin*{equation}{stpappendix}}

%% #1 — обязательное | рекомендуемое | справочное, #2 — заголовок
\newcommand{\stpappendix}[2]{%
  \clearpage
  \refstepcounter{stpappendix}%
  \phantomsection
  \begingroup
    \centering\stpnohyphen
    {\normalfont\bfseries\stpheadsize ПРИЛОЖЕНИЕ \thestpappletter}\par
    {\normalfont (#1)}\par
    {\normalfont\bfseries\stpheadsize #2}\par
  \endgroup
  \addcontentsline{toc}{section}{Приложение \thestpappletter\ (#1) #2}%
  \par\addvspace{18bp}\par\ignorespaces}

%% ------------------------------------------------------- титульный лист
%% Вёрстка титульного листа зашита здесь; снаружи заполняются только поля.
%% Образцы: СТП приложение В (пояснительная записка), форма кафедры (отчёт).
\RequirePackage{xkeyval}

\def\stp@vid{}      \def\stp@disc{}   \def\stp@num{}    \def\stp@tema{}
\def\stp@stud{}     \def\stp@grp{}    \def\stp@ruk{}    \def\stp@rukdolzh{}
\def\stp@oboz{}     \def\stp@dopusk{} \def\stp@vidtext{}
\def\stp@vidvin{}
\def\stp@labkind{по лабораторной работе}

\define@key{stptitle}{вид}{\def\stp@vid{#1}}
\define@key{stptitle}{дисциплина}{\def\stp@disc{#1}}
\define@key{stptitle}{номер}{\def\stp@num{#1}}
\define@key{stptitle}{тема}{\def\stp@tema{#1}}
\define@key{stptitle}{студент}{\def\stp@stud{#1}}
\define@key{stptitle}{группа}{\def\stp@grp{#1}}
\define@key{stptitle}{руководитель}{\def\stp@ruk{#1}}
\define@key{stptitle}{преподаватель}{\def\stp@ruk{#1}}
\define@key{stptitle}{должность}{\def\stp@rukdolzh{#1}}
\define@key{stptitle}{обозначение}{\def\stp@oboz{#1}}
\define@key{stptitle}{допустить}{\def\stp@dopusk{#1}}
\define@key{stptitle}{факультет}{\def\stp@fak{#1}}
\define@key{stptitle}{кафедра}{\def\stp@kaf{#1}}
\define@key{stptitle}{город}{\def\stp@gorod{#1}}
\define@key{stptitle}{год}{\def\stp@god{#1}}
\define@key{stptitle}{наименование}{\def\stp@vidtext{#1}}

%% значения по умолчанию — правятся здесь один раз под свою кафедру
\def\stp@fak{информационных технологий и управления}
\def\stp@kaf{информационных технологий автоматизированных систем}
\def\stp@gorod{Минск}
\edef\stp@god{\the\year}

%% требуемое поле не заполнено — останавливаем сборку с понятным сообщением
\newcommand{\stp@require}[2]{%
  \ifx#1\@empty\ClassError{stp}{Не заполнено поле титульного листа: #2}%
    {Добавьте «#2 = ...» в \string\stptitle{...}}\fi}

%% шапка, общая для всех видов работ
\newcommand{\stp@titlehead}{%
  \begin{center}
    Министерство образования Республики Беларусь\par
    \vspace{\baselineskip}
    Учреждение образования\par
    БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ\par
    ИНФОРМАТИКИ И РАДИОЭЛЕКТРОНИКИ\par
  \end{center}
  \vspace{\baselineskip}
  \noindent Факультет \stp@fak\par
  \noindent Кафедра \stp@kaf\par}

%% строка подписи: слева должность/роль, справа инициалы и фамилия (СТП, прил. В)
\newcommand{\stpsig}[2]{%
  \par\noindent
  \parbox[t]{0.60\textwidth}{\raggedright\stpnohyphen #1}%
  \hfill
  \parbox[t]{0.36\textwidth}{\raggedright\stpnohyphen #2}\par}

%% правый блок (подпись «Выполнил / Проверил» в отчётах)
\newenvironment{stprightblock}
  {\par\noindent\hfill\begin{minipage}[t]{0.43\textwidth}\raggedright\stpnohyphen}
  {\end{minipage}\par}

\newcommand{\stp@titlefoot}{%
  \vfill
  \begin{center}\stp@gorod{} \stp@god\end{center}}

%% ---------- отчёт по лабораторной работе (форма кафедры)
\newcommand{\stp@title@lab}{%
  \stp@require{\stp@num}{номер}%
  \stp@require{\stp@disc}{дисциплина}%
  \stp@require{\stp@stud}{студент}%
  \stp@require{\stp@grp}{группа}%
  \stp@titlehead
  \vspace{\stretch{2}}
  \begin{center}
    ОТЧЕТ\par
    \stp@labkind{} №\,\stp@num\par
    \vspace{\baselineskip}
    по дисциплине\par
    «\stp@disc»\par
    \ifx\stp@tema\@empty\else
      \vspace{\baselineskip}
      на тему «\stp@tema»\par
    \fi
  \end{center}
  \vspace{\stretch{3}}
  \stpsig{Выполнил:}{студент группы \stp@grp\\ \stp@stud}
  \vspace{2\baselineskip}
  \ifx\stp@ruk\@empty\else
    \stpsig{Проверила:}{\ifx\stp@rukdolzh\@empty\else\stp@rukdolzh\\ \fi\stp@ruk}
  \fi
  \vspace{\stretch{2}}
  \begin{center}\stp@gorod{} \stp@god\end{center}}

%% ---------- пояснительная записка к курсовой работе (СТП, приложение В)
\newcommand{\stp@title@kurs}{%
  \stp@require{\stp@tema}{тема}%
  \stp@require{\stp@stud}{студент}%
  \stp@require{\stp@grp}{группа}%
  \stp@require{\stp@ruk}{руководитель}%
  \stp@titlehead
  \ifx\stp@dopusk\@empty\else
    \vspace{2\baselineskip}%
    \begin{stprightblock}\stp@dopusk\end{stprightblock}
  \fi
  \vfill
  \begin{center}
    ПОЯСНИТЕЛЬНАЯ ЗАПИСКА\par
    к курсовой работе\par
    \ifx\stp@disc\@empty\else по дисциплине «\stp@disc»\par\fi
    на тему\par
    \vspace{0.5\baselineskip}
    {\bfseries\MakeUppercase{\stp@tema}}\par
    \ifx\stp@oboz\@empty\else
      \vspace{\baselineskip}\stp@oboz\par
    \fi
  \end{center}
  \vfill
  \stpsig{Студент гр. \stp@grp}{\stp@stud}
  \vspace{0.5\baselineskip}
  \stpsig{Руководитель\ifx\stp@rukdolzh\@empty\else\\ \stp@rukdolzh\fi}{\stp@ruk}
  \stp@titlefoot}

%% ---------- реферат (СТП 1.2.5)
%% Заголовочная часть по образцу: «ТЕМА : курсовая работа / И. И. Иванов. --
%% Минск : БГУИР, 2026. -- 45 с.» Реферативная часть пишется текстом следом.
\def\stpref@tema{}\def\stpref@avtor{}\def\stpref@obem{}
\define@key{stpref}{тема}{\def\stpref@tema{#1}}
\define@key{stpref}{автор}{\def\stpref@avtor{#1}}
\define@key{stpref}{объём}{\def\stpref@obem{#1}}
\define@key{stpref}{город}{\def\stp@gorod{#1}}
\define@key{stpref}{год}{\def\stp@god{#1}}

\newcommand{\stpreferat}[1]{%
  \clearpage\stpnonumber
  \begingroup
  \setkeys{stpref}{#1}%
  \stp@require{\stpref@tema}{тема}%
  \stp@require{\stpref@avtor}{автор}%
  \stp@require{\stpref@obem}{объём}%
  \begingroup\centering\normalfont\bfseries\stpheadsize
    РЕФЕРАТ\par\endgroup
  \addvspace{18bp}%
  \par\stpref@tema{}~:~\stp@vidtext{} / \stpref@avtor. --
    \stp@gorod{}~:~БГУИР, \stp@god. -- \stpref@obem.\par
  \vspace{18bp}
  \endgroup
  \par\ignorespaces}

%% ---------- задание на курсовую работу / дипломный проект (СТП, прил. Б)
%% Печатается на одном листе с двух сторон с зеркальными полями, входит в
%% нумерацию, но номера на нём не ставят.
\def\stpz@stud{}\def\stpz@kurs{}\def\stpz@grp{}\def\stpz@spec{}
\def\stpz@tema{}\def\stpz@ish{}\def\stpz@vopr{}\def\stpz@graf{}
\def\stpz@kons{}\def\stpz@plan{}\def\stpz@zav{}\def\stpz@ruk{}
\def\stpz@prikaz{}\def\stpz@vydacha{}\def\stpz@sdacha{}

\define@key{stpz}{студент}{\def\stpz@stud{#1}}
\define@key{stpz}{курс}{\def\stpz@kurs{#1}}
\define@key{stpz}{группа}{\def\stpz@grp{#1}}
\define@key{stpz}{специальность}{\def\stpz@spec{#1}}
\define@key{stpz}{тема}{\def\stpz@tema{#1}}
\define@key{stpz}{исходные}{\def\stpz@ish{#1}}
\define@key{stpz}{вопросы}{\def\stpz@vopr{#1}}
\define@key{stpz}{графика}{\def\stpz@graf{#1}}
\define@key{stpz}{консультанты}{\def\stpz@kons{#1}}
\define@key{stpz}{график}{\def\stpz@plan{#1}}
\define@key{stpz}{заведующий}{\def\stpz@zav{#1}}
\define@key{stpz}{руководитель}{\def\stpz@ruk{#1}}
\define@key{stpz}{приказ}{\def\stpz@prikaz{#1}}
\define@key{stpz}{выдано}{\def\stpz@vydacha{#1}}
\define@key{stpz}{сдача}{\def\stpz@sdacha{#1}}
\define@key{stpz}{кафедра}{\def\stp@kaf{#1}}
\define@key{stpz}{год}{\def\stp@god{#1}}

%% пояснение мелким шрифтом под заполненной строкой
\newcommand{\stpz@hint}[1]{{\par\centering\fontsize{10bp}{12bp}\selectfont (#1)\par}}
%% раздел задания: название с новой строки, содержимое — с отступа
\newcommand{\stpz@block}[2]{%
  \ifx#2\@empty\else
    \par\addvspace{6bp}#1\par
    \begingroup\leftskip=1.25cm\relax #2\par\endgroup
  \fi}

\newcommand{\stpzadanie}[1]{%
  \clearpage
  \begingroup
  \setkeys{stpz}{#1}%
  \ifx\stp@vidvin\@empty
    \ClassError{stp}{\string\stpzadanie{} вызван до \string\stptitle}%
      {Вид работы берётся из титульного листа: поставьте \string\stpzadanie
       после \string\stptitle}%
  \fi
  \stp@require{\stpz@stud}{студент}%
  \stp@require{\stpz@grp}{группа}%
  \stp@require{\stpz@tema}{тема}%
  \stp@require{\stpz@ish}{исходные}%
  \stp@require{\stpz@vopr}{вопросы}%
  \stp@require{\stpz@ruk}{руководитель}%
  \stpnonumber
  \setlength{\parindent}{0pt}\stpragged
  %% ---- лицевая сторона
  \begin{center}
    БЕЛОРУССКИЙ ГОСУДАРСТВЕННЫЙ УНИВЕРСИТЕТ\par
    ИНФОРМАТИКИ И РАДИОЭЛЕКТРОНИКИ\par
  \end{center}
  \addvspace{12bp}
  Кафедра \stp@kaf
  \stpz@hint{наименование кафедры}
  \addvspace{12bp}
  \begin{stprightblock}
    УТВЕРЖДАЮ\\
    Заведующий кафедрой\\
    \rule{35mm}{0.4pt}\ \stpz@zav\\
    «\rule{8mm}{0.4pt}» \rule{30mm}{0.4pt} \stp@god{} г.
  \end{stprightblock}
  \addvspace{18bp}
  \begin{center}
    {\bfseries ЗАДАНИЕ}\par
    на \stp@vidvin\par
  \end{center}
  \addvspace{12bp}
  Обучающемуся \stpz@stud
  \stpz@hint{фамилия, собственное имя, отчество}
  \ifx\stpz@kurs\@empty\else Курс \stpz@kurs\hspace{2em}\fi
  Учебная группа \stpz@grp\par
  \ifx\stpz@spec\@empty\else Специальность \stpz@spec\par\fi
  \addvspace{6bp}
  Тема работы\par
  \begingroup\leftskip=1.25cm\relax \stpz@tema\par\endgroup
  \stpz@hint{наименование темы}
  \ifx\stpz@prikaz\@empty\else Утверждена приказом ректора \stpz@prikaz\par\fi
  \stpz@block{Исходные данные к работе}{\stpz@ish}
  \stpz@block{Перечень подлежащих разработке вопросов}{\stpz@vopr}
  %% ---- оборотная сторона: зеркальные поля
  \clearpage
  \newgeometry{left=15mm,right=30mm,top=20mm,bottom=20mm,footskip=10mm}%
  \stpnonumber
  \stpz@block{Перечень графического материала}{\stpz@graf}
  \stpz@block{Консультанты по работе}{\stpz@kons}
  \ifx\stpz@plan\@empty\else
    \par\addvspace{6bp}Календарный график выполнения работы\par
    \addvspace{6bp}
    \begin{tabularx}{\linewidth}{|X|p{38mm}|p{26mm}|}\hline
      Наименование этапов & Срок выполнения & Примечание\\\hline
      \stpz@plan
    \end{tabularx}\par
  \fi
  \addvspace{12bp}
  \ifx\stpz@vydacha\@empty\else Дата выдачи задания \stpz@vydacha\par\fi
  \ifx\stpz@sdacha\@empty\else Срок сдачи законченной работы \stpz@sdacha\par\fi
  \addvspace{18bp}
  Руководитель\hfill\rule{30mm}{0.4pt}\ \stpz@ruk\par
  \addvspace{18bp}
  Подпись обучающегося \rule{45mm}{0.4pt}\par
  \addvspace{6bp}
  Дата «\rule{8mm}{0.4pt}» \rule{30mm}{0.4pt} \stp@god{} г.\par
  \clearpage
  \restoregeometry
  \endgroup}

%% \stptitle{вид = лабораторная | курсовая, поле = значение, ...}
\newcommand{\stptitle}[1]{%
  \clearpage\stpnonumber
  \begingroup
  \setkeys{stptitle}{#1}%
  \setlength{\parindent}{0pt}%
  \stpragged
  \def\stp@l{лабораторная}\def\stp@k{курсовая}\def\stp@p{практическая}%
  \ifx\stp@vid\stp@p \gdef\stp@labkind{по индивидуальной практической работе}%
    \gdef\stp@vidtext{отчёт по индивидуальной практической работе}%
    \gdef\stp@vidvin{отчёт по индивидуальной практической работе}\stp@title@lab
  \else\ifx\stp@vid\stp@l \gdef\stp@vidtext{отчёт по лабораторной работе}%
    \gdef\stp@vidvin{отчёт по лабораторной работе}\stp@title@lab
  \else\ifx\stp@vid\stp@k \gdef\stp@vidtext{курсовая работа}%
    \gdef\stp@vidvin{курсовую работу}\stp@title@kurs
  \else\ClassError{stp}{Неизвестный вид работы: \stp@vid}%
       {Допустимые значения поля «вид»: лабораторная, практическая, курсовая}%
  \fi\fi\fi
  \endgroup
  \clearpage}

%% ------------------------------------------------- список источников
\newlist{stpsources}{enumerate}{1}
\setlist[stpsources]{label={[\arabic*]\hspace{0.5em}},ref={\arabic*},
                     itemindent=1.25cm,align=left,leftmargin=0pt,labelwidth=0pt,
                     labelsep=0pt,topsep=0pt,parsep=0pt,itemsep=0pt,nosep}
\newcommand{\stpcite}[1]{[\ref{#1}]}

%% \stpsrc{тип = книга, ...} — библиографическое описание собирается классом.
%% Автор пишет только поля, пунктуацию ГОСТ 7.1-2003 (« / », « . -- », « : »,
%% пробелы вокруг знаков) расставляет класс.
\def\stpsrc@type{}\def\stpsrc@lbl{}\def\stpsrc@avt{}\def\stpsrc@zag{}
\def\stpsrc@svd{}\def\stpsrc@otv{}\def\stpsrc@izn{}\def\stpsrc@gor{}
\def\stpsrc@izd{}\def\stpsrc@god{}\def\stpsrc@str{}\def\stpsrc@jrn{}
\def\stpsrc@nom{}\def\stpsrc@stz{}\def\stpsrc@url{}\def\stpsrc@dat{}

\define@key{stpsrc}{тип}{\def\stpsrc@type{#1}}
\define@key{stpsrc}{метка}{\def\stpsrc@lbl{#1}}
\define@key{stpsrc}{автор}{\def\stpsrc@avt{#1}}
\define@key{stpsrc}{заглавие}{\def\stpsrc@zag{#1}}
\define@key{stpsrc}{сведения}{\def\stpsrc@svd{#1}}
\define@key{stpsrc}{ответственность}{\def\stpsrc@otv{#1}}
\define@key{stpsrc}{издание}{\def\stpsrc@izn{#1}}
\define@key{stpsrc}{город}{\def\stpsrc@gor{#1}}
\define@key{stpsrc}{издательство}{\def\stpsrc@izd{#1}}
\define@key{stpsrc}{год}{\def\stpsrc@god{#1}}
\define@key{stpsrc}{страниц}{\def\stpsrc@str{#1}}
\define@key{stpsrc}{журнал}{\def\stpsrc@jrn{#1}}
\define@key{stpsrc}{номер}{\def\stpsrc@nom{#1}}
\define@key{stpsrc}{страницы}{\def\stpsrc@stz{#1}}
\define@key{stpsrc}{url}{\def\stpsrc@url{#1}}
\define@key{stpsrc}{дата}{\def\stpsrc@dat{#1}}

%% заглавие и необязательные сведения после двоеточия
\newcommand{\stpsrc@title}{%
  \stpsrc@zag\ifx\stpsrc@svd\@empty\else{} : \stpsrc@svd\fi}
%% выходные данные: издание, город, издательство, год
\newcommand{\stpsrc@imprint}{%
  \ifx\stpsrc@izn\@empty\else{} -- \stpsrc@izn\fi
  {} -- \stpsrc@gor{} : \stpsrc@izd, \stpsrc@god.}

\newcommand{\stpsrc}[1]{%
  \begingroup
  \def\stpsrc@type{}\def\stpsrc@lbl{}\def\stpsrc@avt{}\def\stpsrc@zag{}%
  \def\stpsrc@svd{}\def\stpsrc@otv{}\def\stpsrc@izn{}\def\stpsrc@gor{}%
  \def\stpsrc@izd{}\def\stpsrc@god{}\def\stpsrc@str{}\def\stpsrc@jrn{}%
  \def\stpsrc@nom{}\def\stpsrc@stz{}\def\stpsrc@url{}\def\stpsrc@dat{}%
  \setkeys{stpsrc}{#1}%
  \stp@require{\stpsrc@lbl}{метка}%
  \stp@require{\stpsrc@zag}{заглавие}%
  \def\stp@t@kn{книга}\def\stp@t@knm{книга4}%
  \def\stp@t@st{статья}\def\stp@t@el{электронный}%
  \item\label{\stpsrc@lbl}%
  \ifx\stpsrc@type\stp@t@kn
    \stp@require{\stpsrc@avt}{автор}\stp@require{\stpsrc@otv}{ответственность}%
    \stpsrc@avt{} \stpsrc@title{} / \stpsrc@otv.\stpsrc@imprint{} --
      \stpsrc@str~с.
  \else\ifx\stpsrc@type\stp@t@knm
    \stp@require{\stpsrc@otv}{ответственность}%
    \stpsrc@title{} / \stpsrc@otv{} [и~др.].\stpsrc@imprint{} --
      \stpsrc@str~с.
  \else\ifx\stpsrc@type\stp@t@st
    \stp@require{\stpsrc@avt}{автор}\stp@require{\stpsrc@jrn}{журнал}%
    \stpsrc@avt{} \stpsrc@title{} / \stpsrc@otv{} // \stpsrc@jrn. --
      \stpsrc@god. --
      \ifx\stpsrc@nom\@empty\else№~\stpsrc@nom. -- \fi
      С.~\stpsrc@stz.
  \else\ifx\stpsrc@type\stp@t@el
    \stp@require{\stpsrc@url}{url}\stp@require{\stpsrc@dat}{дата}%
    \stpsrc@title{} [Электронный ресурс].
      \ifx\stpsrc@god\@empty\else{} -- \stpsrc@god.\fi
      {} -- Режим доступа : \stpsrc@url. -- Дата доступа : \stpsrc@dat.
  \else
    \ClassError{stp}{Неизвестный тип источника: \stpsrc@type}%
      {Допустимые значения поля «тип»: книга, книга4, статья, электронный}%
  \fi\fi\fi\fi
  \endgroup}

%% ------------------------------------------------------------ примечания
%% одно примечание (СТП 2.9.3)
\newcommand{\stpnote}[1]{\par\noindent\hspace{\parindent}Примечание~--~#1\par}
\newenvironment{stpnotes}
  {\par\noindent\hspace{\parindent}Примечания\par
   \begin{stpnum}}
  {\end{stpnum}}

%% сноска: арабская цифра со скобкой (СТП 2.9.1)
\renewcommand{\thefootnote}{\arabic{footnote})}

\endinput
