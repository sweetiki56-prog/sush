# Stage V content generator: companions and Chapter V «Кристалл». Run from the repo root; idempotent.
import json, sys
sys.path.insert(0, __import__('os').path.dirname(__import__('os').path.abspath(__file__)))
from jsonfmt import table

F=lambda k,v=None: {"type":"flag","key":k,**({} if v is None else {"value":v})}
Q=lambda q,s: {"type":"quest","quest":q,"stage":s}
G=lambda i,n=None: {"type":"give","item":i,**({} if n is None else {"qty":n})}
T=lambda i,n=None: {"type":"take","item":i,**({} if n is None else {"qty":n})}
CAPS=lambda n: {"type":"caps","amount":n}
INC=lambda k,by=1: {"type":"inc","key":k,"by":by}
KARMA=lambda n: {"type":"karma","amount":n}
XP=lambda n: {"type":"xp","amount":n}
BARTER=lambda t: {"type":"open","window":"barter","id":t}
GOTO=lambda m,e: {"type":"goto","map":m,"entry":e}
JOIN=lambda i: {"type":"join","id":i}
LEAVE=lambda i: {"type":"leave","id":i}
def opt(text,next=None,**kw):
    o={"text":text}
    for k in ("if","effects","check"):
        if k in kw: o[k]=kw[k]
    if next: o["next"]=next
    return o
def node(text, options, effects=None):
    n={"text":text}
    if effects: n["effects"]=effects
    n["options"]=options
    return n
BYE=lambda t="Отойти.": opt(t)
def dlg(speaker, entry, nodes, portrait=None):
    d={"speaker":speaker}
    if portrait: d["portrait"]=portrait
    d["entry"]=entry; d["nodes"]=nodes
    return d
def chk(skill=None, attr=None, mod=0, pass_=None, fail=None, pe=None, fe=None):
    c={}
    if skill: c["skill"]=skill
    if attr: c["attr"]=attr
    c["mod"]=mod; c["pass"]=pass_; c["fail"]=fail
    if pe: c["passEffects"]=pe
    if fe: c["failEffects"]=fe
    return c
E=lambda *conds: [{"if":list(c),"node":n} if c else {"node":n} for *c,n in conds]
fl=lambda k,eq=None: {"flag":k,**({} if eq is None else {"eq":eq})}
nf=lambda k: {"notFlag":k}
it=lambda i: {"item":i}
ni=lambda i: {"noItem":i}
caps=lambda n: {"caps":n}
at=lambda a,n: {"attr":a,"gte":n}
atl=lambda a,n: {"attr":a,"lt":n}
sk=lambda s,n: {"skill":s,"gte":n}


D={}
SKIT_IN=lambda way,extra=[]: [F("skit_way",way),F("skit_in"),F("open_skit_gate_a"),F("open_skit_gate_b"),Q("skit","archive"),XP(100)]+extra
KEEP=INC("keeper_marks")
RR=[F("ring_result",False)]
END=lambda fate,extra=[]: [F("dew_fate",fate),F("chapter6_done"),Q("skit","done"),XP(250)]+extra

# ---------------- the gate and the trials ----------------
D['skit_gate']=dlg("Привратник Скита",E([fl("skit_in"),"passed"],[fl("ring_result"),"bout_after"],["intro"]),{
 "intro":node("Рыцарь в белом плаще поверх стальной кирасы не двигается. — Скит закрыт для мирских. Войти может тот, кто выдержит испытание — знанием или силой. Или тот, кто знает слово.",[
  opt("Испытание знанием.","trial"),
  opt("Испытание силой.","strength"),
  opt("Роса собирается ночью.","password",**{"if":[fl("irga_password")],"effects":SKIT_IN("password")}),
  BYE()],[Q("skit","enter")]),
 "trial":node("— Три вопроса. — Рыцарь загибает пальцы. — Откуда берётся роса? Куда уходит вода, когда её никто не пьёт? И чего стоит вода, которую нельзя выпить?",[
  opt("Роса — пар из воздуха, осевший на холодном. Вода уходит в соль и в небо. А непитьевую — перегоняют.",None,**{"check":chk(skill="science",mod=-10,pass_="wise",fail="wrong",pe=SKIT_IN("knowledge",[F("trial","science"),Q("trial","done"),KEEP]))}),
  opt("[Интеллект] Роса — там, где ночь холоднее воздуха. Вода уходит, куда её пускают. Непитьевая стоит столько, сколько стоит тот, кто её очистит.","wise",**{"if":[at("int",7)],"effects":SKIT_IN("knowledge",[F("trial","mind"),Q("trial","done"),KEEP])}),
  opt("Вода мокрая. Вот и всё.","simple",**{"if":[atl("int",4)],"effects":SKIT_IN("knowledge",[F("trial","simple"),Q("trial","done"),KEEP])}),
  BYE("Подумаю.")],[Q("trial","asked")]),
 "password":node("Рыцарь медленно поворачивает голову. — Кто тебе сказал? — Не дождавшись ответа, он поднимает руку. — Слово есть слово. Входи.",[BYE("Войти.")]),
 "wise":node("Рыцарь молчит, потом склоняет голову. — Настоятель будет рад. Проходи. — Решётка ползёт вверх.",[BYE("Войти.")]),
 "simple":node("Рыцарь моргает. Из-за стены раздаётся смех — старый, добрый. — Пусти, — говорит голос. — Самый верный ответ за сорок лет. — Решётка ползёт вверх.",[BYE("Войти.")]),
 "wrong":node("— Нет. — Рыцарь не меняется в лице. — Приходи, когда подумаешь.",[BYE()]),
 "strength":node("— Сила. — Рыцарь кивает на соседа у стены. — Брат Кремнец выйдет с тобой. До падения, своим оружием. Устоишь — войдёшь.",[
  opt("Начнём.",**{"effects":[F("ring_fight")]}),BYE("Не сейчас.")]),
 "bout_after":node("Рыцарь смотрит на брата на песке.",[
  opt("…","won",**{"if":[fl("ring_result","won")]}),
  opt("…","lost",**{"if":[fl("ring_result","lost")]}),
  opt("…","lost",**{"if":[fl("ring_result","left")]})]),
 "won":node("— Устоял. — Рыцарь поднимает руку, и решётка ползёт вверх. — Сила — тоже знание. Входи.",[BYE("Войти.")],RR+SKIT_IN("strength",[KEEP])),
 "lost":node("— Не сегодня. Отлежись.",[BYE()],RR),
 "passed":node("— Проходи. Настоятель в зале.",[BYE()])},"portrait_dew_knight")
D['skit_gate_bars']=dlg("Ворота Скита",E(["look"]),{"look":node("Стальная решётка. Поднимают её изнутри.",[BYE()])})
D['trial_knight']=dlg("Рыцарь испытания",E(["hi"]),{"hi":node("Рыцарь разминает плечи и кивает на привратника.",[BYE()])})
D['dew_knight']=dlg("Рыцарь Росы",E([fl("order_enemy"),"enemy"],["hi"]),{"hi":node("— Вода из воздуха принадлежит тем, кто умеет её беречь.",[BYE()]),"enemy":node("Рыцарь кладёт руку на разрядник.",[BYE()])})
D['novice']=dlg("Послушник",E(["hi"]),{"hi":node("— Паруса надо чистить до рассвета, пока не высохли. — Послушник зевает. — Каждый день.",[BYE()])})

# ---------------- Кассиан ----------------
D['kassian']=dlg("Настоятель Кассиан",E([fl("dew_fate"),"after"],[fl("stuzha_way"),fl("dew_way"),"choice"],["intro"]),{
 "intro":node("Сухой старик в белом капюшоне поднимает глаза от чаши с водой. — Кассиан. Орден Росы помнит, что вода — не товар. Люди разлили реку. Разлили бы и росу. — Он улыбается мягко. — Что привело тебя в Скит?",[
  opt("Архив. Мне нужны записи о «Верблюде» и о подделке Мандата.","archive_ask",**{"if":[nf("archive_ok")]}),
  opt("Росоуловители. Вода из воздуха — почему её прячут?","dew",**{"if":[nf("dew_way")]}),
  opt("Стужа требует отдать Мандат. Отмените приказ.","revoke_lever",**{"if":[fl("stuzha_demand"),nf("stuzha_way"),fl("kassian_kin")]}),
  opt("Стужа требует отдать Мандат. Отмените приказ.",None,**{"if":[fl("stuzha_demand"),nf("stuzha_way"),nf("kassian_kin")],"check":chk(skill="speech",mod=-10,pass_="revoked",fail="refuse",pe=[F("stuzha_way","revoked"),Q("skit","choice"),XP(120)])}),
  opt("Колючка голодает. Одолжите хутору один росоуловитель.",None,**{"if":[fl("ivan_truth"),nf("unaccounted")],"check":chk(skill="speech",mod=0,pass_="lent",fail="refuse",pe=[F("unaccounted","lent"),Q("unaccounted","done"),KEEP,XP(100),KARMA(2)])}),
  BYE()]),
 "archive_ask":node("— Архив открыт хранителям, — говорит Кассиан. — Не мирским.",[
  opt("Ваш предок, Верес Кассианов, вёл «Проект Верблюд». Его имя стёрли в Кристалле.","archive_yes",**{"if":[fl("kassian_kin")]}),
  opt("Кристалл вернул имя Кассианова на Стену. Вы родня Солевикам.","archive_yes",**{"if":[fl("order_bridge")]}),
  opt("Понимаю.","intro")]),
 "archive_yes":node("Кассиан долго молчит, глядя в чашу. — Верес. Мы не говорим об этом даже себе. — Он поднимает голову. — Брат Свиток пустит тебя. Скажи, что я велел.",[opt("…","intro")],[F("archive_ok")]),
 "dew":node("— Роса-1 умела собирать воду из воздуха. Мы умеем до сих пор. — Кассиан ставит чашу. — Разлей знание — и его выпьют за год. Тресты построят паруса по всей Суши и будут продавать воздух. Мы бережём, чтобы было что беречь.",[
  opt("Оставьте тайну себе. Мне хватит Мандата.","kept",**{"effects":[F("dew_way","kept"),F("order_ally"),Q("skit","stuzha"),XP(100)]}),
  opt("Сделайте меня хранителем. Я служу Ордену делом.","keeper",**{"if":[{"flag":"keeper_marks","gte":3}],"effects":[F("dew_way","keeper"),G("dew_plans"),F("keeper"),Q("skit","stuzha"),XP(150)]}),
  opt("Как стать хранителем?","how"),
  BYE("Подумаю.")]),
 "how":node("— Делами. Трижды. — Кассиан загибает пальцы. — Выдержи испытание. Реши дело нашего брата Ивана — он ворует паруса. Помоги «Росе-2»: там спит то, что мы не смеем будить, и живёт тот, кто нас старше.",[opt("…","intro")],[F("keeper_asked")]),
 "kept":node("— Мудро. — Кассиан впервые смотрит тепло. — Орден помнит тех, кто умеет не брать. Когда придёт время, мы будем рядом.",[BYE("…")]),
 "keeper":node("Кассиан снимает с шеи медный ключ. — Хранитель. — В сейфе подземного цеха — чертежи; он отдаёт их сам, завёрнутыми в полотно. — Береги. И помни, чем кончилась река.",[BYE("…")]),
 "revoke_lever":node("Вы говорите одно имя: Верес Кассианов. Кассиан бледнеет. — Стужа, — зовёт он негромко. — Мандат остаётся у гостя. Это приказ.",[BYE("…")],[F("stuzha_way","revoked"),Q("skit","choice"),XP(120)]),
 "revoked":node("— Стужа! — Кассиан поднимается. — Мандат — у гостя. Орден не отнимает то, что ему не доверено. — Стужа уходит, сжав кулаки.",[BYE("…")]),
 "lent":node("— Иван, сын Прокопа… — Кассиан вздыхает. — Пусть Колючка возьмёт парус. На год. Потом — вернёт или построит свой.",[BYE("…")]),
 "refuse":node("— Нет. — Кассиан возвращается к своей чаше.",[BYE()]),
 "choice":node("— Ты видел архив, видел паруса, видел брата Стужу, — говорит Кассиан. — Скажи, куда уйдёт роса, когда ты откроешь Глубокое?",[
  opt("Роса останется Ордену. Беречь вы умеете.","end_order",**{"effects":END("order",[F("order_ally")]+([T("dew_plans")]))}),
  opt("Роса — для всех. Чертежи уйдут к людям.","end_all",**{"if":[it("dew_plans")],"effects":END("all",[F("order_cold")])}),
  BYE("Позже.")]),
 "end_order":node("Кассиан кивает. — Тогда Орден встанет рядом, когда Сушь будет решать. Иди в Верховья. Там начинается вода — и там её держат.",[BYE("…")]),
 "end_all":node("Кассиан долго молчит. — Ты разольёшь росу, как разлили реку. — Он отворачивается. — Посмотрим, кто окажется прав. Иди.",[BYE("…")]),
 "after":node("— Роса выпадает каждую ночь. Даже для тех, кто в неё не верит.",[BYE()])},"portrait_kassian")
D['stuzha']=dlg("Брат Стужа",E([fl("stuzha_demand"),"again"],["intro"]),{
 "intro":node("Высокий рыцарь в кирасе, с разрядником на плече. — Стужа. Знаменосец. Мандат — довоенная печать на воду. Такие вещи хранит Орден, а не бродяги. Отдай его на хранение — добром.",[
  opt("Попробуй взять.","fight",**{"effects":[F("stuzha_fight")]}),
  opt("Спроси настоятеля.","ask",**{"effects":[F("stuzha_demand")]}),
  BYE("Подумаю.")],[Q("skit","stuzha")]),
 "fight":node("— Поединок. — Стужа снимает разрядник с плеча. — До падения.",[BYE("…")]),
 "ask":node("— Настоятель мягок. — Стужа сплёвывает. — Но спроси. Я подожду. Недолго.",[BYE()]),
 "again":node("— Мандат, — напоминает Стужа.",[opt("Попробуй взять.","fight",**{"effects":[F("stuzha_fight")]}),BYE()])},"portrait_stuzha")

# ---------------- the archive ----------------
D['svitok']=dlg("Брат Свиток",E(["intro"]),{
 "intro":node("Близорукий монах в очках-консервах водит пальцем по корешкам. — Архив «Росы». Посторонним — нельзя. Хранителям — осторожно.",[
  opt("Настоятель велел пустить меня.","open",**{"if":[fl("archive_ok")],"effects":[F("open_archive_grate")]}),
  opt("Настоятель прислал за записями о «Верблюде». Срочно.",None,**{"if":[nf("open_archive_grate")],"check":chk(skill="speech",mod=-20,pass_="open",fail="no",pe=[F("open_archive_grate")])}),
  BYE()]),
 "open":node("Свиток отпирает решётку дальней комнаты. — Письма — на левой полке. Ничего не рвать, не мочить, не дышать.",[BYE()]),
 "no":node("— Настоятель ничего не присылает. Он приходит сам.",[BYE()])},"portrait_svitok")
D['archive_grate']=dlg("Решётка дальней комнаты",E([fl("open_archive_grate"),"open"],["look"]),{
 "look":node("Решётка на старом замке. За ней — полки с письмами.",[
  opt("Вскрыть, пока Свиток дремлет над книгой.",None,**{"check":chk(skill="lockpick",mod=-10,pass_="opened",fail="stuck",pe=[F("open_archive_grate")])}),BYE()]),
 "opened":node("Замок щёлкает.",[BYE()]),"stuck":node("Отмычка скребёт. Свиток поднимает голову — вы делаете вид, что читаете.",[BYE()]),
 "open":node("Решётка открыта.",[BYE()])})
D['letter_shelf']=dlg("Полка с письмами",E([it("stempel_letter"),"taken"],["look"]),{
 "look":node("Письма в папках, перевязанных бечёвкой. Одна папка подписана: «Запруда. Печати».",[
  opt("Открыть папку.","letter",**{"effects":[G("stempel_letter"),F("seal_mark_8"),Q("skit","dew"),XP(120)]}),BYE()]),
 "letter":node("«Председателю Г. Затвору. Копия изготовлена по образцу, печать № 7-бис вырезана мастером. Подлинник надлежит изъять у предъявителя любыми средствами. Первый Печатник А. Штемпель». В углу — капля красного воска: рука, держащая печать. Нотариус Запруды — не просто нотариус.",[BYE()]),
 "taken":node("Пустая папка.",[BYE()])})
D['archive_duct']=dlg("Вентиляционный люк",E(["look"]),{"look":node("Воздуховод уходит вниз, к цеху под Скитом.",[opt("Спуститься в цех.",**{"effects":[GOTO("skit_depths","duct")]}),BYE()])})
D['depths_duct']=dlg("Воздуховод к архиву",E(["look"]),{"look":node("Узкий воздуховод ведёт наверх, в архив.",[opt("Подняться в архив.",**{"effects":[GOTO("skit_archive","duct")]}),BYE()])})
D['skit_hatch']=dlg("Спуск в «Росу-1»",E([fl("skit_in"),"look"],["closed"]),{"look":node("Люк и лестница в гудящий подвал.",[opt("Спуститься.",**{"effects":[GOTO("skit_depths","stairs")]}),BYE()]),"closed":node("Люк заперт изнутри.",[BYE()])})
D['stairs_up']=dlg("Лестница во двор",E(["look"]),{"look":node("Лестница наверх, во двор Скита.",[opt("Подняться.",**{"effects":[GOTO("skit_yard","hatch")]}),BYE()])})

# ---------------- the works below: the plans ----------------
D['dew_safe']=dlg("Сейф с чертежами",E([fl("dew_way"),"done"],["look"]),{
 "look":node("Довоенный сейф с кодовым колесом и замком под ключ. Надпись: «Роса-1. Техническая документация».",[
  opt("Вскрыть замок.",None,**{"check":chk(skill="lockpick",mod=-20,pass_="stolen",fail="alarm",pe=[F("dew_way","stolen"),G("dew_plans"),F("order_enemy"),Q("skit","stuzha"),XP(150)],fe=[F("depths_alarm")])}),
  opt("Обойти замок через щиток питания.",None,**{"if":[sk("repair",50)],"check":chk(skill="repair",mod=0,pass_="stolen",fail="alarm",pe=[F("dew_way","stolen"),G("dew_plans"),F("order_enemy"),Q("skit","stuzha"),XP(150)],fe=[F("depths_alarm")])}),
  BYE()]),
 "stolen":node("Дверца отходит. Внутри — рулоны чертежей в вощёном полотне: паруса, насосы, конденсаторы. Вода из воздуха, на бумаге. Наверху уже поднимают тревогу.",[BYE("…")]),
 "alarm":node("Сейф отвечает воем сирены. Сторожевые машины поворачивают головы.",[BYE("…")]),
 "done":node("Пустой сейф.",[BYE()])})
D['vent_rosa']=dlg("Вентшахта",E(["look"]),{"look":node("Узкая шахта уходит под соль, в сторону «Росы-2».",[
 opt("Уйти вентшахтой — с Мандатом.",**{"if":[fl("stuzha_demand"),nf("stuzha_way")],"effects":[F("stuzha_way","slipped"),Q("skit","choice"),XP(80),GOTO("rosa_deep","vent")]}),
 opt("Пролезть в «Росу-2».",**{"effects":[GOTO("rosa_deep","vent")]}),BYE()])})
D['vent_skit']=dlg("Вентшахта под солью",E(["look"]),{"look":node("Шахта тянет холодом. Ирга говорила: выводит под Скит, мимо ворот.",[
 opt("Пролезть под Скит.",**{"effects":[GOTO("skit_depths","vent")]}),BYE()])})

# ---------------- «Роса-2» ----------------
D['rosa_hatch']=dlg("Спуск в лаборатории",E(["look"]),{"look":node("Люк в бетоне, ступени вниз, в темноту.",[opt("Спуститься.",**{"effects":[GOTO("rosa_lab","stairs")]}),BYE()])})
D['lab_up']=dlg("Лестница наверх",E(["look"]),{"look":node("Наверх, к свету.",[opt("Подняться.",**{"effects":[GOTO("rosa_surface","hatch")]}),BYE()])})
D['lab_down']=dlg("Лестница к капсулам",E(["look"]),{"look":node("Вниз, к капсулам.",[opt("Спуститься.",**{"effects":[GOTO("rosa_deep","ladder")]}),BYE()])})
D['deep_up']=dlg("Лестница в лаборатории",E(["look"]),{"look":node("Наверх, в лаборатории.",[opt("Подняться.",**{"effects":[GOTO("rosa_lab","ladder")]}),BYE()])})
D['gas_valve']=dlg("Вентиль газовой магистрали",E([fl("gas_vented"),"done"],["look"]),{
 "look":node("Ржавый вентиль с табличкой «Азот. Не открывать при людях». Из трубы шипит.",[
  opt("[Ремонт] Перекрыть магистраль и открыть вытяжку.","vented",**{"if":[sk("repair",40)],"effects":[F("gas_vented")]}),
  opt("[Выживание] Намотать мокрую тряпку и докрутить вентиль, не дыша.","vented",**{"if":[sk("survival",50)],"effects":[F("gas_vented")]}),
  opt("Крутить вентиль изо всех сил.",None,**{"check":chk(attr="str",mod=-10,pass_="vented",fail="stuck",pe=[F("gas_vented")])}),
  BYE()]),
 "vented":node("Шипение стихает, где-то наверху гудит вытяжка. Воздух светлеет.",[BYE()]),
 "stuck":node("Вентиль не поддаётся.",[BYE()]),
 "done":node("Вентиль закрыт.",[BYE()])})
D['lab_door']=dlg("Дверь лаборатории",E([fl("seal_mark_9"),"done"],["look"]),{
 "look":node("Стальная дверь с надписью «Главная лаборатория». Замок взломан давно и аккуратно.",[
  opt("[Восприятие] На косяке — капля красного воска с оттиском руки.","wax",**{"if":[at("per",5)],"effects":[F("seal_mark_9"),XP(60)]}),BYE()]),
 "wax":node("Сургуч побывал здесь раньше Ордена. Кто-то уже искал записи «Проекта Верблюд» — и нашёл.",[BYE()]),
 "done":node("Дверь с каплей воска на косяке.",[BYE()])})
D['chalk_notes']=dlg("Записи мелом",E(["look"]),{"look":node("На стене мелом, свежим: «Колба 4 — пусто. Колба 7 — пусто. Лекарство? Спросить у Вереса. ВЕРЕСА НЕТ. Двести лет. Не забыть слова: вода, соль, дверь». Почерк уверенный, а буквы — будто разучились.",[BYE()],[F("lab_tech_asked"),Q("lab_tech","asked")])})
LT=lambda how,extra=[]: [F("lab_tech",how),Q("lab_tech","done"),XP(120)]+extra
D['petr']=dlg("Лаборант",E([fl("lab_tech"),"after"],["intro"]),{
 "intro":node("Сухой человек с кожей, похожей на кору, стоит у терминала и пишет мелом по экрану. — Смена… — Он оборачивается. — Вы не из смены. Вы… новый? Пётр. Лаборант. Я жду Вереса. Двести лет, мне сказали. Я не верю, но мел кончается.",[
  opt("Что ты здесь хранишь?","cure")],[F("lab_tech_asked"),Q("lab_tech","truth")]),
 "cure":node("— Лекарство от пресной хвори. Для «Верблюдов». Колба одиннадцать. — Он достаёт мутную склянку. — Не всё. Частичное. Старики выживут. Верес велел отдать тому, кто придёт с печатью. У вас печать?",[
  opt("Отдам Солевикам. Кристаллу.","salters",**{"effects":LT("salters",[G("fresh_cure"),KARMA(2)])}),
  opt("Отдам Ордену. Они сберегут.","order",**{"effects":LT("order",[KEEP])}),
  opt("Оставь у себя. Жди Вереса.","left",**{"effects":LT("left")})]),
 "salters":node("— Солевикам. — Пётр кивает, будто что-то вспомнил. — Да. Он так и сказал.",[BYE("…")]),
 "order":node("— Ордену… — Пётр мнётся, потом отдаёт склянку. Позже её унесут рыцари, а Кассиан запишет в книгу хранителей ваше имя.",[BYE("…")]),
 "left":node("Пётр прячет склянку обратно. — Я подожду. Мел ещё есть.",[BYE("…")]),
 "after":node("Пётр пишет на экране слово «дверь» и обводит его.",[BYE()])},"portrait_petr")
CP=lambda how,extra=[]: [F("capsule",how),Q("capsule","done")]+extra
D['capsule']=dlg("Капсула",E([fl("capsule"),"done"],["look"]),{
 "look":node("Под инеем стекла — человек с соляными наростами на плечах. Табличка: «Верблюд-1. Первое поколение. Сон по приказу Смотрителя».",[
  opt("Разбудить: подать ток и открыть клапаны.",None,**{"check":chk(skill="science",mod=-20,pass_="woken",fail="fail",pe=CP("woken",[F("veres_witness"),KEEP,XP(150)]))}),
  opt("Оставить спать.","sleep",**{"effects":CP("sleeping",[XP(40)])}),
  opt("Отключить капсулу.","stopped",**{"effects":CP("stopped",[KARMA(-2)])}),
  BYE()],[Q("capsule","asked")]),
 "woken":node("Иней тает. Человек в капсуле открывает глаза и долго смотрит в потолок. — Верес? — хрипит он. — Где Смотритель? Мы должны… открыть… — Он видит вас и замолкает.",[BYE("…")]),
 "fail":node("Капсула гудит и гаснет обратно. Попробовать можно ещё раз.",[BYE()]),
 "sleep":node("Вы вытираете иней со стекла. Пусть спит.",[BYE("…")]),
 "stopped":node("Гудение стихает. Иней больше не нарастает.",[BYE("…")]),
 "done":node("Капсула.",[BYE()])})
D['camel_first']=dlg("«Верблюд» из капсулы",E(["hi"]),{"hi":node("— Двести лет… — Первый «Верблюд» сидит, обхватив колени. — Верес был высокий, с шрамом на подбородке. Он говорил: «Глубокое откроет тот, кто не станет продавать». Я помню его лицо. Найдите его — хоть мёртвого.",[BYE()])})

# ---------------- «Неучтённый», Иван, Ирга ----------------
UN=lambda how,extra=[]: [F("unaccounted",how),Q("unaccounted","done"),XP(100)]+extra
D['ivan_bunk']=dlg("Нары послушника",E([fl("ivan_truth"),"done"],["look"]),{
 "look":node("Жёсткие нары. Под ними что-то звякает.",[
  opt("[Восприятие] Под нарами — зажимы от паруса и сетка, свёрнутая в рулон.","found",**{"if":[at("per",6)],"effects":[F("ivan_clue")]}),BYE()]),
 "found":node("Детали росоуловителя, тщательно завёрнутые. И письмо без конверта: «Сынок, Колючка держится. Твой отец Прокоп».",[BYE()],[F("ivan_truth"),Q("unaccounted","truth")]),
 "done":node("Пустые нары.",[BYE()])})
D['ivan']=dlg("Послушник Иван",E([fl("ivan_truth"),"truth"],["intro"]),{
 "intro":node("Молодой послушник поспешно прячет руки в рукава. — Я… молюсь. Ночью. Тут все молятся.",[
  opt("Кто-то разбирает парус по ночам.",None,**{"if":[fl("unaccounted_asked")],"check":chk(skill="speech",mod=0,pass_="confess",fail="deny",pe=[F("ivan_truth"),Q("unaccounted","truth")])}),BYE()]),
 "confess":node("Иван садится на нары. — Колючка. Хутор моего отца, Прокопа. У них грядки сохнут. Один парус — и они живы. А здесь парусов — как белья.",[opt("…","truth")]),
 "deny":node("— Я молюсь, — упрямо повторяет Иван.",[BYE()]),
 "truth":node("— Что теперь? — Иван смотрит на вас. — Выдадите?",[
  opt("Выдам Ордену. Воровство есть воровство.","given",**{"effects":UN("given",[KEEP,F("ivan_given")])}),
  opt("Помогу унести парус. Колючке он нужнее.","helped",**{"effects":UN("helped",[F("kolyuchka_dew"),F("order_cold"),KARMA(2)])}),
  opt("Попрошу настоятеля одолжить парус хутору.","ask")]),
 "given":node("Иван молча идёт к Кассиану. Его увозят в дальний скит, до конца года. Колючка без паруса.",[BYE("…")]),
 "helped":node("Ночью вы вдвоём выносите сложенный парус к вентшахте. К утру Иван уже на полпути к Колючке. Рыцари ищут вора; Кассиан молчит.",[BYE("…")]),
 "ask":node("— Настоятель? — Иван бледнеет. — Он… может. Он добрый. Только Стужа против.",[BYE()])},"portrait_ivan")
D['irga']=dlg("Сестра Ирга",E([fl("irga_met"),"again"],["intro"]),{
 "intro":node("У костра сидит женщина в залатанной рясе Ордена, с разрядником на коленях. — Если вы от Кассиана — я не вернусь. — Она смотрит внимательнее. — Не от Кассиана. Ирга. Целительница. Была.",[
  opt("Почему ушла из Скита?","why")],[F("irga_met")]),
 "why":node("— Потому что вода из воздуха лежит у них в сейфе, а люди в Колючке сохнут. Я лечила жажду — и знала, что её можно не допустить. — Ирга подбрасывает ветку в огонь. — Если идёте в Скит: пароль привратнику — «Роса собирается ночью». Или вентшахтой из подвала, под солью.",[
  opt("Там кто-то ворует паруса?","ask_ivan")],[F("irga_password"),F("irga_vent")]),
 "ask_ivan":node("— Говорят, кто-то из послушников разбирает парус ночами. Если это правда — помогите ему, а не Ордену. — Она протягивает руку. — Найдёте вора — приходите. Пойду с вами.",[BYE()],[F("unaccounted_asked"),Q("unaccounted","asked")]),
 "again":node("— Что нового в Скиту?",[
  opt("Пойдём со мной.","join",**{"if":[{"flag":"unaccounted","eq":"helped"},nf("with_irga")],"effects":[JOIN("irga")]}),
  opt("Пойдём со мной.","join",**{"if":[{"flag":"unaccounted","eq":"lent"},nf("with_irga")],"effects":[JOIN("irga")]}),
  opt("Пойдём со мной снова.","join",**{"if":[fl("met_irga"),nf("with_irga")],"effects":[JOIN("irga")]}),
  opt("[Обаяние] Ты нужна в дороге. Пойдём.","join",**{"if":[at("cha",7),nf("with_irga")],"effects":[JOIN("irga")]}),
  opt("Чертежи — у меня. Отдадим их людям.","end_all",**{"if":[it("dew_plans"),fl("stuzha_way")],"effects":END("all",[F("order_cold")])}),
  BYE()]),
 "join":node("Ирга закидывает мешок на плечо. — Разрядник я держу за спиной. Бинты — в руках.",[BYE("…")]),
 "end_all":node("Ирга разворачивает чертежи прямо на песке и смеётся — впервые. — Паруса можно шить в каждом хуторе. Вода — для всех.",[BYE("…")])},"portrait_irga")
D['comp_irga']=dict(json.load(open('src/content/dialogues/crystal.json'))['comp_shepot'])
D['comp_irga']['speaker']="Сестра Ирга"
D['comp_irga']=json.loads(json.dumps(D['comp_irga']).replace('shepot','irga').replace("Шёпот поправляет капюшон. — Слушаю.","Ирга проверяет бинты в сумке. — Кого латать?").replace("Шёпот сидит в рядах «Пыльной чаши» рядом с братом. — Опять дорога? Вьюн справится и без меня.","Ирга греется у костра «Росы-2». — Опять дорога? Пойдём.").replace("— Позади — моё место. Оттуда видно всех.","— Позади так позади. Оттуда видно, кого перевязать.").replace("— Вернусь к брату. Найдёшь меня в «Чаше».","— Вернусь к своему костру у «Росы-2».").replace("— Идём. Долг есть долг.","— Идём. Бинты при мне."))
D['comp_irga']['nodes']['with']['options'].insert(-1, opt("Чертежи — у меня. Отдадим их людям.","end_all",**{"if":[it("dew_plans"),fl("stuzha_way")],"effects":END("all",[F("order_cold")])}))
D['comp_irga']['nodes']['end_all']=node("Ирга разворачивает чертежи прямо на песке и смеётся — впервые. — Паруса можно шить в каждом хуторе. Вода — для всех.",[BYE("…")])

open('src/content/dialogues/skit.json','w').write(json.dumps(D,ensure_ascii=False,indent=1)+'\n')

# ---------------- companions, quests, items, creatures, weapons, places ----------------
COMP=json.load(open('src/content/companions.json'))
COMP['irga']={"name":"Сестра Ирга","sheet":"irga","creature":"irga_ally","dialogue":"comp_irga","barks":[
 {"map":"skit_yard","text":"Паруса всё так же белые. А люди внизу всё так же сохнут."},
 {"map":"rosa_lab","text":"Здесь их делали. «Верблюдов». Не смотри в клетки долго."},
 {"map":"crystal_gate","text":"Солевики пьют рассол, как мы воду. Орден знал, как им помочь. И молчал."}]}
open('src/content/companions.json','w').write(table(COMP))
QS=json.load(open('src/content/quests.json'))
def alt(cond, text): return {"if":cond,"journal":text}
QS['skit']={"title":"Скит","stages":[
 {"id":"enter","xp":20,"journal":"Скит, цитадель Ордена Росы, закрыт для мирских. Войти можно испытанием — знанием или силой, словом-паролем или вентшахтой из «Росы-2»."},
 {"id":"archive","xp":80,"journal":"Я в Скиту. В архиве «Росы» — записи о «Верблюде» и, говорят, письма из Запруды. Хранитель — брат Свиток."},
 {"id":"dew","xp":100,"journal":"Письмо Первого Печатника Штемпеля Затвору: копия Мандата изготовлена по приказу, подлинник велено изъять. Сургуч стоит за подделкой. А Орден прячет росоуловители — воду из воздуха."},
 {"id":"stuzha","xp":80,"journal":"С тайной росоуловителей решено. Брат Стужа требует отдать Мандат Ордену «на хранение»."},
 {"id":"choice","xp":80,"journal":"Мандат при мне. Осталось решить, куда уйдёт роса: Ордену или всем."},
 {"id":"done","xp":250,"journal":"Роса выбрана. Впереди — Верховья. Глава VI окончена.","alt":[alt([fl("dew_fate","all")],"Чертежи росоуловителей ушли к людям. Орден недоволен. Впереди — Верховья. Глава VI окончена."),alt([fl("dew_fate","order")],"Роса осталась Ордену, а Орден — на моей стороне. Впереди — Верховья. Глава VI окончена.")]}]}
QS['unaccounted']={"title":"Неучтённый","stages":[
 {"id":"asked","xp":20,"journal":"Ирга: в Скиту кто-то из послушников по ночам разбирает росоуловитель."},
 {"id":"truth","xp":60,"journal":"Вор — послушник Иван, сын Прокопа. Парус он хочет унести в Колючку, где сохнут грядки."},
 {"id":"done","xp":100,"journal":"С Иваном решено.","alt":[alt([fl("unaccounted","given")],"Иван выдан Ордену. Колючка без паруса."),alt([fl("unaccounted","helped")],"Парус унесён в Колючку. Ирга довольна, Орден ищет вора."),alt([fl("unaccounted","lent")],"Кассиан одолжил Колючке парус на год.")]}]}
QS['trial']={"title":"Испытание знанием","stages":[
 {"id":"asked","xp":10,"journal":"Привратник Скита задаёт три вопроса о воде."},
 {"id":"done","xp":80,"journal":"Испытание знанием пройдено. Ворота Скита открыты."}]}
QS['lab_tech']={"title":"Лаборант","stages":[
 {"id":"asked","xp":20,"journal":"В лабораториях «Росы-2» кто-то оставляет свежие записи мелом."},
 {"id":"truth","xp":60,"journal":"Это Пётр, Полусухой лаборант проекта: двести лет ждёт Вереса. У него — лекарство от «пресной хвори»."},
 {"id":"done","xp":100,"journal":"С лекарством Петра решено.","alt":[alt([fl("lab_tech","salters")],"Лекарство от «пресной хвори» — для Солевиков. Кварц узнает."),alt([fl("lab_tech","order")],"Лекарство ушло Ордену. Кассиан записал моё имя."),alt([fl("lab_tech","left")],"Пётр оставил лекарство себе и ждёт Вереса.")]}]}
QS['capsule']={"title":"Последняя капсула","stages":[
 {"id":"asked","xp":20,"journal":"В глубине «Росы-2» спит «Верблюд» первого поколения."},
 {"id":"done","xp":80,"journal":"С капсулой решено.","alt":[alt([fl("capsule","woken")],"Первый «Верблюд» проснулся. Он помнит Вереса в лицо."),alt([fl("capsule","sleeping")],"Первый «Верблюд» спит дальше."),alt([fl("capsule","stopped")],"Капсула отключена.")]}]}
open('src/content/quests.json','w').write(json.dumps(QS,ensure_ascii=False,indent=1)+'\n')
IT=json.load(open('src/content/items.json'))
IT['stempel_letter']={"name":"Письмо Штемпеля","desc":"«Председателю Г. Затвору. Копия изготовлена по образцу… Первый Печатник А. Штемпель». Капля красного воска в углу. Улика против Сургуча.","icon":"icon_letter","cat":"quest","value":0}
IT['dew_plans']={"name":"Чертежи росоуловителей","desc":"Рулоны в вощёном полотне: паруса, конденсаторы, насосы «Росы-1». Вода из воздуха — на бумаге.","icon":"icon_schematic","cat":"quest","value":0}
IT['fresh_cure']={"name":"Лекарство от пресной хвори","desc":"Мутная склянка из колбы одиннадцать. Частичное: старики-Солевики выживут.","icon":"icon_antidote","cat":"quest","value":0}
open('src/content/items.json','w').write(json.dumps(IT,ensure_ascii=False,indent=2)+'\n')
C=json.load(open('src/content/creatures.json'))
C['dew_knight']={"name":"Рыцарь Росы","sheet":"dew_knight","tags":["human"],"hp":26,"ap":8,"seq":10,"skill":55,"guns":55,"aim":6,"weapons":["sparker","knife"],"dr":20,"dt":3,"crit":5,"perception":6,"xp":90,"loot":{"cells":4},"fleeAt":0.2}
C['dew_knight_trial']={"name":"Брат Кремнец","sheet":"dew_knight","tags":["human"],"hp":22,"ap":7,"seq":9,"skill":50,"weapons":["stunbaton"],"dr":15,"dt":2,"crit":5,"perception":6,"xp":60,"fleeAt":0,"fleeText":"{name} опускается на колено и поднимает руку: довольно."}
C['stuzha']={"name":"Брат Стужа","sheet":"stuzha","tags":["human"],"hp":40,"ap":8,"seq":11,"skill":60,"guns":60,"aim":7,"weapons":["sparker","machete"],"dr":20,"dt":3,"crit":6,"perception":7,"xp":180,"fleeAt":0.25,"spare":True,"fleeText":"{name} опускается на колено и отбрасывает разрядник."}
C['sentry']={"name":"Сторожевая машина","sheet":"sentry","tags":["machine"],"res":{"poison":100,"shock":-40},"hp":28,"ap":7,"seq":8,"skill":55,"guns":55,"aim":5,"weapons":["sentry_zap"],"dr":25,"dt":3,"crit":4,"perception":6,"xp":80,"loot":{"scrap":2},"fleeAt":0}
C['camel_reject']={"name":"«Верблюд»-брак","sheet":"camel_reject","tags":["human"],"res":{"wet":-40},"hp":15,"ap":9,"seq":12,"skill":55,"weapons":["reject_claw"],"dr":5,"crit":6,"perception":5,"xp":50,"fleeAt":0}
C['irga_ally']={"name":"Сестра Ирга","sheet":"irga","tags":["human"],"hp":24,"ap":8,"seq":10,"skill":45,"guns":55,"aim":6,"weapons":["sparker","knife"],"dr":10,"dt":1,"crit":5,"perception":7,"xp":0,"fleeAt":0,"heal":10}
open('src/content/creatures.json','w').write(table(C))
Wp=json.load(open('src/content/weapons.json'))
Wp['sentry_zap']={"name":"Разряд машины","skill":"guns","ap":4,"dmg":[6,12],"range":6,"type":"shock"}
Wp['reject_claw']={"name":"Когти «Верблюда»","skill":"melee","ap":3,"dmg":[4,9],"range":1}
open('src/content/weapons.json','w').write(table(Wp))
L=open('src/content/locations.json').read()
old='''  "skit": {
    "name": "Скит",
    "cell": [100, 7],
    "chapter": 6
  },'''
if old in L:
    L=L.replace(old,'''  "skit": {
    "name": "Скит",
    "cell": [100, 7],
    "chapter": 6,
    "map": "skit_yard",
    "entry": "south",
    "open": [{ "flag": "chapter5_seen" }],
    "areas": [
      { "map": "skit_yard", "entry": "south", "name": "Двор Скита", "at": [0.5, 0.7] },
      { "map": "skit_cells", "entry": "south", "name": "Кельи и зал", "at": [0.5, 0.25], "known": [{ "flag": "skit_in" }] },
      { "map": "skit_archive", "entry": "west", "name": "Архив «Росы»", "at": [0.8, 0.45], "known": [{ "flag": "skit_in" }] },
      { "map": "skit_depths", "entry": "stairs", "name": "Цех «Роса-1»", "at": [0.3, 0.5], "known": [{ "flag": "skit_in" }] }
    ]
  },
  "rosa": {
    "name": "«Роса-2»",
    "cell": [96, 13],
    "chapter": 6,
    "map": "rosa_surface",
    "entry": "west",
    "open": [{ "flag": "chapter5_seen" }],
    "areas": [
      { "map": "rosa_surface", "entry": "west", "name": "Поверхность", "at": [0.3, 0.6] },
      { "map": "rosa_lab", "entry": "stairs", "name": "Лаборатории", "at": [0.6, 0.45], "known": [{ "flag": "lab_tech_asked" }] },
      { "map": "rosa_deep", "entry": "ladder", "name": "Капсулы", "at": [0.75, 0.25], "known": [{ "flag": "lab_tech_asked" }] }
    ]
  },''')
open('src/content/locations.json','w').write(L)
print('ok')
