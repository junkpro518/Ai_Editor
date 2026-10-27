/* eslint-disable */
// مولَّد آلياً (pnpm gen:types) — ajv standalone، لا تعدّل يدوياً.
"use strict";
export const validateProject = validate20;
const schema31 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"ai-editor/project/1","title":"Project Document (مصدر الحقيقة الوحيد)","type":"object","required":["schemaVersion","id","name","createdAt","updatedAt","source","style","transcript","transcriptJob","timeline","captions","proposals","corrections","styleUpdateProposals","seed"],"additionalProperties":false,"properties":{"schemaVersion":{"const":1},"id":{"type":"string"},"name":{"type":"string"},"createdAt":{"type":"string","format":"date-time"},"updatedAt":{"type":"string","format":"date-time"},"seed":{"type":"integer"},"source":{"type":"object","required":["id","path","fileName","hash","durationUs","frameCount","fps","width","height","hasAudio"],"additionalProperties":false,"properties":{"id":{"type":"string"},"path":{"type":"string"},"fileName":{"type":"string"},"hash":{"type":"string","description":"sha256(أول 64MB + الحجم)"},"durationUs":{"type":"integer","minimum":0,"maximum":900000000,"description":"≤ 15 دقيقة (FR-019)"},"fps":{"$ref":"#/$defs/rational","description":"معدل المشروع الثابت (CFR)؛ لمصدر VFR = أقرب معدل معياري لـ avg_frame_rate"},"sourceIsVfr":{"type":"boolean"},"frameCount":{"type":"integer","minimum":1,"description":"من ffprobe -count_frames عند الاستيراد (nb_frames غير موثوق)؛ على شبكة fps المشروع"},"rotation":{"type":"integer"},"width":{"type":"integer"},"height":{"type":"integer"},"hasAudio":{"type":"boolean"},"fileSize":{"type":"integer"},"mtime":{"type":"string"},"container":{"type":"string"},"videoCodec":{"type":"string"},"audioCodec":{"type":"string"}}},"style":{"type":"object","required":["styleId","version"],"additionalProperties":false,"properties":{"styleId":{"type":"string"},"version":{"type":"integer","minimum":1}}},"transcript":{"oneOf":[{"type":"null"},{"title":"Transcript","type":"object","required":["schemaVersion","provider","model","modelParams","language","durationUs","audioSha256","words","createdAt"],"additionalProperties":false,"properties":{"schemaVersion":{"const":1},"provider":{"type":"string","description":"openai | groq | deepgram | elevenlabs | local-whisper ..."},"model":{"type":"string"},"modelParams":{"type":"object","description":"language, mip_opt_out, ... كما أُرسلت"},"audioSha256":{"type":"string","description":"بصمة ملف الصوت المرسَل"},"language":{"type":"string","description":"BCP-47، مثل ar"},"durationUs":{"type":"integer","minimum":0},"createdAt":{"type":"string","format":"date-time"},"words":{"type":"array","items":{"type":"object","required":["id","text","startUs","endUs","confidence"],"additionalProperties":false,"properties":{"id":{"type":"string"},"text":{"type":"string","minLength":1},"startUs":{"type":"integer","minimum":0},"endUs":{"type":"integer","minimum":0},"confidence":{"oneOf":[{"type":"number","minimum":0,"maximum":1},{"type":"null"}],"description":"مُطبَّعة 0..1 (ElevenLabs: exp(logprob))؛ null إن المزود لا يعطي ثقة لكل كلمة. علامة «منخفض الثقة» تُحسب عند العرض: confidence < threshold المزود"},"lang":{"type":"string"},"original":{"type":"string","description":"النص قبل أي تصحيح"},"correctedBy":{"enum":["user","auto"],"description":"auto محجوزة للتصحيح التلقائي في ميزة لاحقة (القرار 21)؛ لا تُكتب في 001"}}}},"segments":{"type":"array","items":{"type":"object","required":["startUs","endUs","wordIds"],"additionalProperties":false,"properties":{"startUs":{"type":"integer"},"endUs":{"type":"integer"},"wordIds":{"type":"array","items":{"type":"string"}},"text":{"type":"string"}}}},"rawRef":{"type":"string","description":"مسار استجابة المزود الخام داخل مجلد المشروع للمراجعة"}}}]},"transcriptJob":{"type":"object","required":["state"],"additionalProperties":false,"properties":{"state":{"enum":["idle","extracting_audio","uploading","transcribing","done","failed"]},"provider":{"type":"string"},"model":{"type":"string"},"progress":{"type":"number","minimum":0,"maximum":1},"audioHash":{"type":"string"},"error":{"type":"string"},"startedAt":{"type":"string"},"finishedAt":{"type":"string"}}},"timeline":{"type":"object","required":["clips"],"additionalProperties":false,"properties":{"clips":{"type":"array","items":{"type":"object","required":["id","sourceId","inFrame","outFrame","timelineStartFrame"],"additionalProperties":false,"properties":{"id":{"type":"string"},"sourceId":{"type":"string"},"inFrame":{"type":"integer","minimum":0,"description":"رقم إطار صحيح على شبكة fps المشروع"},"outFrame":{"type":"integer","minimum":0,"description":"حصري"},"timelineStartFrame":{"type":"integer","minimum":0},"label":{"type":"string"}}}}}},"captions":{"type":"object","required":["enabled","cues"],"additionalProperties":false,"properties":{"enabled":{"type":"boolean"},"cues":{"type":"array","items":{"type":"object","required":["id","startFrame","endFrame","wordIds","lines","fontSizePx"],"additionalProperties":false,"properties":{"id":{"type":"string"},"startFrame":{"type":"integer"},"endFrame":{"type":"integer"},"fontSizePx":{"type":"integer","description":"ناتج fit محسوب مرة واحدة"},"activeWordRects":{"type":"array","description":"مستطيلات الكلمات بالبكسل بدقة المصدر، محسوبة مرة واحدة","items":{"type":"array","items":{"type":"number"},"minItems":4,"maxItems":4}},"wordIds":{"type":"array","items":{"type":"string"}},"lines":{"type":"array","items":{"type":"string"}}}}}}},"proposals":{"type":"array","items":{"$ref":"#/$defs/proposal"}},"corrections":{"type":"array","items":{"$ref":"#/$defs/correction"}},"styleUpdateProposals":{"type":"array","items":{"$ref":"#/$defs/styleUpdateProposal"}}},"$defs":{"rational":{"type":"object","required":["num","den"],"additionalProperties":false,"properties":{"num":{"type":"integer","minimum":1},"den":{"type":"integer","minimum":1}}},"reason":{"enum":["silence","repeat","abandoned","filler"]},"proposal":{"type":"object","required":["id","createdAt","styleRef","items","totals","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"items":{"type":"array","items":{"type":"object","required":["id","startUs","endUs","text","reason","ruleId","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"startUs":{"type":"integer"},"endUs":{"type":"integer"},"text":{"type":"string"},"reason":{"$ref":"#/$defs/reason"},"ruleId":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1},"state":{"enum":["proposed","excluded","applied","blocked"]},"blockedBy":{"type":"string"}}}},"totals":{"type":"object","required":["byReason","savedUs"],"additionalProperties":false,"properties":{"byReason":{"type":"object","required":["silence","repeat","abandoned","filler"],"additionalProperties":{"type":"integer"}},"savedUs":{"type":"integer","minimum":0}}},"state":{"enum":["draft","reviewed","applied","discarded"]},"localOnly":{"type":"boolean","description":"true إن لم يُستخدم مزود سحابي للتمييز الذكي؛ في 001 الأسباب الأربعة كلها بقواعد محلية فالقيمة true دائماً (FR-003، plan.md §Assumptions)"}}},"correction":{"type":"object","required":["id","at","actor","kind","quote"],"additionalProperties":false,"properties":{"id":{"type":"string"},"at":{"type":"string"},"actor":{"const":"user"},"kind":{"enum":["exclude_item","exclude_all","manual_edit","word_fix"]},"proposalId":{"type":"string"},"itemId":{"type":"string"},"ruleId":{"type":"string"},"reason":{"$ref":"#/$defs/reason"},"quote":{"type":"string"},"before":{},"after":{},"violates":{"type":"string","description":"ruleId لقاعدة إلزامية كسرها تعديل يدوي (يُسمح مع تحذير)"}}},"styleUpdateProposal":{"type":"object","required":["id","createdAt","styleRef","trigger","diff","newPrecedents","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"trigger":{"type":"object","required":["kind","correctionIds"],"additionalProperties":false,"properties":{"kind":{"enum":["repeated_rejection"]},"reason":{"$ref":"#/$defs/reason"},"count":{"type":"integer"},"correctionIds":{"type":"array","items":{"type":"string"}}}},"diff":{"type":"array","items":{"type":"object","required":["path","from","to"],"properties":{"path":{"type":"string"},"from":{},"to":{}}}},"newPrecedents":{"type":"array","items":{"type":"object"}},"state":{"enum":["pending","accepted","rejected"]},"decidedAt":{"type":"string"}}}}};
const schema32 = {"type":"object","required":["num","den"],"additionalProperties":false,"properties":{"num":{"type":"integer","minimum":1},"den":{"type":"integer","minimum":1}}};
const func1 = Object.prototype.hasOwnProperty;
const func4 = require("ajv/dist/runtime/ucs2length").default;
const formats0 = require("ajv-formats/dist/formats").fullFormats["date-time"];
const schema33 = {"type":"object","required":["id","createdAt","styleRef","items","totals","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"items":{"type":"array","items":{"type":"object","required":["id","startUs","endUs","text","reason","ruleId","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"startUs":{"type":"integer"},"endUs":{"type":"integer"},"text":{"type":"string"},"reason":{"$ref":"#/$defs/reason"},"ruleId":{"type":"string"},"confidence":{"type":"number","minimum":0,"maximum":1},"state":{"enum":["proposed","excluded","applied","blocked"]},"blockedBy":{"type":"string"}}}},"totals":{"type":"object","required":["byReason","savedUs"],"additionalProperties":false,"properties":{"byReason":{"type":"object","required":["silence","repeat","abandoned","filler"],"additionalProperties":{"type":"integer"}},"savedUs":{"type":"integer","minimum":0}}},"state":{"enum":["draft","reviewed","applied","discarded"]},"localOnly":{"type":"boolean","description":"true إن لم يُستخدم مزود سحابي للتمييز الذكي؛ في 001 الأسباب الأربعة كلها بقواعد محلية فالقيمة true دائماً (FR-003، plan.md §Assumptions)"}}};
const schema34 = {"enum":["silence","repeat","abandoned","filler"]};

function validate21(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate21.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.createdAt === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "createdAt"},message:"must have required property '"+"createdAt"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.styleRef === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleRef"},message:"must have required property '"+"styleRef"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.items === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "items"},message:"must have required property '"+"items"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.totals === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "totals"},message:"must have required property '"+"totals"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.state === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "state"},message:"must have required property '"+"state"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "id") || (key0 === "createdAt")) || (key0 === "styleRef")) || (key0 === "items")) || (key0 === "totals")) || (key0 === "state")) || (key0 === "localOnly"))){
const err6 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err7 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.createdAt !== undefined){
if(typeof data.createdAt !== "string"){
const err8 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.styleRef !== undefined){
let data2 = data.styleRef;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.styleId === undefined){
const err9 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data2.version === undefined){
const err10 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.styleId !== undefined){
if(typeof data2.styleId !== "string"){
const err11 = {instancePath:instancePath+"/styleRef/styleId",schemaPath:"#/properties/styleRef/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data2.version !== undefined){
let data4 = data2.version;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
const err12 = {instancePath:instancePath+"/styleRef/version",schemaPath:"#/properties/styleRef/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
}
else {
const err13 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.items !== undefined){
let data5 = data.items;
if(Array.isArray(data5)){
const len0 = data5.length;
for(let i0=0; i0<len0; i0++){
let data6 = data5[i0];
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.id === undefined){
const err14 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(data6.startUs === undefined){
const err15 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "startUs"},message:"must have required property '"+"startUs"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data6.endUs === undefined){
const err16 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "endUs"},message:"must have required property '"+"endUs"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(data6.text === undefined){
const err17 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
if(data6.reason === undefined){
const err18 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
if(data6.ruleId === undefined){
const err19 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "ruleId"},message:"must have required property '"+"ruleId"+"'"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
if(data6.state === undefined){
const err20 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/required",keyword:"required",params:{missingProperty: "state"},message:"must have required property '"+"state"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
for(const key1 in data6){
if(!(func1.call(schema33.properties.items.items.properties, key1))){
const err21 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
if(data6.id !== undefined){
if(typeof data6.id !== "string"){
const err22 = {instancePath:instancePath+"/items/" + i0+"/id",schemaPath:"#/properties/items/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data6.startUs !== undefined){
let data8 = data6.startUs;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
const err23 = {instancePath:instancePath+"/items/" + i0+"/startUs",schemaPath:"#/properties/items/items/properties/startUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data6.endUs !== undefined){
let data9 = data6.endUs;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
const err24 = {instancePath:instancePath+"/items/" + i0+"/endUs",schemaPath:"#/properties/items/items/properties/endUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
}
if(data6.text !== undefined){
if(typeof data6.text !== "string"){
const err25 = {instancePath:instancePath+"/items/" + i0+"/text",schemaPath:"#/properties/items/items/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data6.reason !== undefined){
let data11 = data6.reason;
if(!((((data11 === "silence") || (data11 === "repeat")) || (data11 === "abandoned")) || (data11 === "filler"))){
const err26 = {instancePath:instancePath+"/items/" + i0+"/reason",schemaPath:"#/$defs/reason/enum",keyword:"enum",params:{allowedValues: schema34.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data6.ruleId !== undefined){
if(typeof data6.ruleId !== "string"){
const err27 = {instancePath:instancePath+"/items/" + i0+"/ruleId",schemaPath:"#/properties/items/items/properties/ruleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
if(data6.confidence !== undefined){
let data13 = data6.confidence;
if(typeof data13 == "number"){
if(data13 > 1 || isNaN(data13)){
const err28 = {instancePath:instancePath+"/items/" + i0+"/confidence",schemaPath:"#/properties/items/items/properties/confidence/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data13 < 0 || isNaN(data13)){
const err29 = {instancePath:instancePath+"/items/" + i0+"/confidence",schemaPath:"#/properties/items/items/properties/confidence/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
else {
const err30 = {instancePath:instancePath+"/items/" + i0+"/confidence",schemaPath:"#/properties/items/items/properties/confidence/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
if(data6.state !== undefined){
let data14 = data6.state;
if(!((((data14 === "proposed") || (data14 === "excluded")) || (data14 === "applied")) || (data14 === "blocked"))){
const err31 = {instancePath:instancePath+"/items/" + i0+"/state",schemaPath:"#/properties/items/items/properties/state/enum",keyword:"enum",params:{allowedValues: schema33.properties.items.items.properties.state.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data6.blockedBy !== undefined){
if(typeof data6.blockedBy !== "string"){
const err32 = {instancePath:instancePath+"/items/" + i0+"/blockedBy",schemaPath:"#/properties/items/items/properties/blockedBy/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
}
else {
const err33 = {instancePath:instancePath+"/items/" + i0,schemaPath:"#/properties/items/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath:instancePath+"/items",schemaPath:"#/properties/items/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data.totals !== undefined){
let data16 = data.totals;
if(data16 && typeof data16 == "object" && !Array.isArray(data16)){
if(data16.byReason === undefined){
const err35 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: "byReason"},message:"must have required property '"+"byReason"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
if(data16.savedUs === undefined){
const err36 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/required",keyword:"required",params:{missingProperty: "savedUs"},message:"must have required property '"+"savedUs"+"'"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
for(const key2 in data16){
if(!((key2 === "byReason") || (key2 === "savedUs"))){
const err37 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data16.byReason !== undefined){
let data17 = data16.byReason;
if(data17 && typeof data17 == "object" && !Array.isArray(data17)){
if(data17.silence === undefined){
const err38 = {instancePath:instancePath+"/totals/byReason",schemaPath:"#/properties/totals/properties/byReason/required",keyword:"required",params:{missingProperty: "silence"},message:"must have required property '"+"silence"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data17.repeat === undefined){
const err39 = {instancePath:instancePath+"/totals/byReason",schemaPath:"#/properties/totals/properties/byReason/required",keyword:"required",params:{missingProperty: "repeat"},message:"must have required property '"+"repeat"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data17.abandoned === undefined){
const err40 = {instancePath:instancePath+"/totals/byReason",schemaPath:"#/properties/totals/properties/byReason/required",keyword:"required",params:{missingProperty: "abandoned"},message:"must have required property '"+"abandoned"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data17.filler === undefined){
const err41 = {instancePath:instancePath+"/totals/byReason",schemaPath:"#/properties/totals/properties/byReason/required",keyword:"required",params:{missingProperty: "filler"},message:"must have required property '"+"filler"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
for(const key3 in data17){
let data18 = data17[key3];
if(!((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18)))){
const err42 = {instancePath:instancePath+"/totals/byReason/" + key3.replace(/~/g, "~0").replace(/\//g, "~1"),schemaPath:"#/properties/totals/properties/byReason/additionalProperties/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
}
else {
const err43 = {instancePath:instancePath+"/totals/byReason",schemaPath:"#/properties/totals/properties/byReason/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
}
if(data16.savedUs !== undefined){
let data19 = data16.savedUs;
if(!((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19)))){
const err44 = {instancePath:instancePath+"/totals/savedUs",schemaPath:"#/properties/totals/properties/savedUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(typeof data19 == "number"){
if(data19 < 0 || isNaN(data19)){
const err45 = {instancePath:instancePath+"/totals/savedUs",schemaPath:"#/properties/totals/properties/savedUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
}
}
}
else {
const err46 = {instancePath:instancePath+"/totals",schemaPath:"#/properties/totals/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data.state !== undefined){
let data20 = data.state;
if(!((((data20 === "draft") || (data20 === "reviewed")) || (data20 === "applied")) || (data20 === "discarded"))){
const err47 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema33.properties.state.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data.localOnly !== undefined){
if(typeof data.localOnly !== "boolean"){
const err48 = {instancePath:instancePath+"/localOnly",schemaPath:"#/properties/localOnly/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
else {
const err49 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
validate21.errors = vErrors;
return errors === 0;
}
validate21.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema35 = {"type":"object","required":["id","at","actor","kind","quote"],"additionalProperties":false,"properties":{"id":{"type":"string"},"at":{"type":"string"},"actor":{"const":"user"},"kind":{"enum":["exclude_item","exclude_all","manual_edit","word_fix"]},"proposalId":{"type":"string"},"itemId":{"type":"string"},"ruleId":{"type":"string"},"reason":{"$ref":"#/$defs/reason"},"quote":{"type":"string"},"before":{},"after":{},"violates":{"type":"string","description":"ruleId لقاعدة إلزامية كسرها تعديل يدوي (يُسمح مع تحذير)"}}};

function validate23(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate23.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.at === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "at"},message:"must have required property '"+"at"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.actor === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "actor"},message:"must have required property '"+"actor"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.kind === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.quote === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quote"},message:"must have required property '"+"quote"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema35.properties, key0))){
const err5 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err6 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
if(data.at !== undefined){
if(typeof data.at !== "string"){
const err7 = {instancePath:instancePath+"/at",schemaPath:"#/properties/at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.actor !== undefined){
if("user" !== data.actor){
const err8 = {instancePath:instancePath+"/actor",schemaPath:"#/properties/actor/const",keyword:"const",params:{allowedValue: "user"},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.kind !== undefined){
let data3 = data.kind;
if(!((((data3 === "exclude_item") || (data3 === "exclude_all")) || (data3 === "manual_edit")) || (data3 === "word_fix"))){
const err9 = {instancePath:instancePath+"/kind",schemaPath:"#/properties/kind/enum",keyword:"enum",params:{allowedValues: schema35.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err10 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.itemId !== undefined){
if(typeof data.itemId !== "string"){
const err11 = {instancePath:instancePath+"/itemId",schemaPath:"#/properties/itemId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.ruleId !== undefined){
if(typeof data.ruleId !== "string"){
const err12 = {instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.reason !== undefined){
let data7 = data.reason;
if(!((((data7 === "silence") || (data7 === "repeat")) || (data7 === "abandoned")) || (data7 === "filler"))){
const err13 = {instancePath:instancePath+"/reason",schemaPath:"#/$defs/reason/enum",keyword:"enum",params:{allowedValues: schema34.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.quote !== undefined){
if(typeof data.quote !== "string"){
const err14 = {instancePath:instancePath+"/quote",schemaPath:"#/properties/quote/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.violates !== undefined){
if(typeof data.violates !== "string"){
const err15 = {instancePath:instancePath+"/violates",schemaPath:"#/properties/violates/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
else {
const err16 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
validate23.errors = vErrors;
return errors === 0;
}
validate23.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema37 = {"type":"object","required":["id","createdAt","styleRef","trigger","diff","newPrecedents","state"],"additionalProperties":false,"properties":{"id":{"type":"string"},"createdAt":{"type":"string"},"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"trigger":{"type":"object","required":["kind","correctionIds"],"additionalProperties":false,"properties":{"kind":{"enum":["repeated_rejection"]},"reason":{"$ref":"#/$defs/reason"},"count":{"type":"integer"},"correctionIds":{"type":"array","items":{"type":"string"}}}},"diff":{"type":"array","items":{"type":"object","required":["path","from","to"],"properties":{"path":{"type":"string"},"from":{},"to":{}}}},"newPrecedents":{"type":"array","items":{"type":"object"}},"state":{"enum":["pending","accepted","rejected"]},"decidedAt":{"type":"string"}}};

function validate25(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate25.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.createdAt === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "createdAt"},message:"must have required property '"+"createdAt"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.styleRef === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleRef"},message:"must have required property '"+"styleRef"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.trigger === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "trigger"},message:"must have required property '"+"trigger"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.diff === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "diff"},message:"must have required property '"+"diff"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.newPrecedents === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "newPrecedents"},message:"must have required property '"+"newPrecedents"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.state === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "state"},message:"must have required property '"+"state"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!((((((((key0 === "id") || (key0 === "createdAt")) || (key0 === "styleRef")) || (key0 === "trigger")) || (key0 === "diff")) || (key0 === "newPrecedents")) || (key0 === "state")) || (key0 === "decidedAt"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err8 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.createdAt !== undefined){
if(typeof data.createdAt !== "string"){
const err9 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.styleRef !== undefined){
let data2 = data.styleRef;
if(data2 && typeof data2 == "object" && !Array.isArray(data2)){
if(data2.styleId === undefined){
const err10 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data2.version === undefined){
const err11 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data2.styleId !== undefined){
if(typeof data2.styleId !== "string"){
const err12 = {instancePath:instancePath+"/styleRef/styleId",schemaPath:"#/properties/styleRef/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data2.version !== undefined){
let data4 = data2.version;
if(!((typeof data4 == "number") && (!(data4 % 1) && !isNaN(data4)))){
const err13 = {instancePath:instancePath+"/styleRef/version",schemaPath:"#/properties/styleRef/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
else {
const err14 = {instancePath:instancePath+"/styleRef",schemaPath:"#/properties/styleRef/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.trigger !== undefined){
let data5 = data.trigger;
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
if(data5.kind === undefined){
const err15 = {instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
if(data5.correctionIds === undefined){
const err16 = {instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/required",keyword:"required",params:{missingProperty: "correctionIds"},message:"must have required property '"+"correctionIds"+"'"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
for(const key1 in data5){
if(!((((key1 === "kind") || (key1 === "reason")) || (key1 === "count")) || (key1 === "correctionIds"))){
const err17 = {instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data5.kind !== undefined){
if(!(data5.kind === "repeated_rejection")){
const err18 = {instancePath:instancePath+"/trigger/kind",schemaPath:"#/properties/trigger/properties/kind/enum",keyword:"enum",params:{allowedValues: schema37.properties.trigger.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data5.reason !== undefined){
let data7 = data5.reason;
if(!((((data7 === "silence") || (data7 === "repeat")) || (data7 === "abandoned")) || (data7 === "filler"))){
const err19 = {instancePath:instancePath+"/trigger/reason",schemaPath:"#/$defs/reason/enum",keyword:"enum",params:{allowedValues: schema34.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data5.count !== undefined){
let data8 = data5.count;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
const err20 = {instancePath:instancePath+"/trigger/count",schemaPath:"#/properties/trigger/properties/count/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data5.correctionIds !== undefined){
let data9 = data5.correctionIds;
if(Array.isArray(data9)){
const len0 = data9.length;
for(let i0=0; i0<len0; i0++){
if(typeof data9[i0] !== "string"){
const err21 = {instancePath:instancePath+"/trigger/correctionIds/" + i0,schemaPath:"#/properties/trigger/properties/correctionIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath:instancePath+"/trigger/correctionIds",schemaPath:"#/properties/trigger/properties/correctionIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
}
else {
const err23 = {instancePath:instancePath+"/trigger",schemaPath:"#/properties/trigger/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.diff !== undefined){
let data11 = data.diff;
if(Array.isArray(data11)){
const len1 = data11.length;
for(let i1=0; i1<len1; i1++){
let data12 = data11[i1];
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
if(data12.path === undefined){
const err24 = {instancePath:instancePath+"/diff/" + i1,schemaPath:"#/properties/diff/items/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data12.from === undefined){
const err25 = {instancePath:instancePath+"/diff/" + i1,schemaPath:"#/properties/diff/items/required",keyword:"required",params:{missingProperty: "from"},message:"must have required property '"+"from"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data12.to === undefined){
const err26 = {instancePath:instancePath+"/diff/" + i1,schemaPath:"#/properties/diff/items/required",keyword:"required",params:{missingProperty: "to"},message:"must have required property '"+"to"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data12.path !== undefined){
if(typeof data12.path !== "string"){
const err27 = {instancePath:instancePath+"/diff/" + i1+"/path",schemaPath:"#/properties/diff/items/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/diff/" + i1,schemaPath:"#/properties/diff/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
}
else {
const err29 = {instancePath:instancePath+"/diff",schemaPath:"#/properties/diff/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
}
if(data.newPrecedents !== undefined){
let data14 = data.newPrecedents;
if(Array.isArray(data14)){
const len2 = data14.length;
for(let i2=0; i2<len2; i2++){
let data15 = data14[i2];
if(!(data15 && typeof data15 == "object" && !Array.isArray(data15))){
const err30 = {instancePath:instancePath+"/newPrecedents/" + i2,schemaPath:"#/properties/newPrecedents/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
else {
const err31 = {instancePath:instancePath+"/newPrecedents",schemaPath:"#/properties/newPrecedents/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
}
if(data.state !== undefined){
let data16 = data.state;
if(!(((data16 === "pending") || (data16 === "accepted")) || (data16 === "rejected"))){
const err32 = {instancePath:instancePath+"/state",schemaPath:"#/properties/state/enum",keyword:"enum",params:{allowedValues: schema37.properties.state.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
if(data.decidedAt !== undefined){
if(typeof data.decidedAt !== "string"){
const err33 = {instancePath:instancePath+"/decidedAt",schemaPath:"#/properties/decidedAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
}
}
else {
const err34 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
validate25.errors = vErrors;
return errors === 0;
}
validate25.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate20(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="ai-editor/project/1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate20.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.id === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.name === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "name"},message:"must have required property '"+"name"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.createdAt === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "createdAt"},message:"must have required property '"+"createdAt"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.updatedAt === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "updatedAt"},message:"must have required property '"+"updatedAt"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.source === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.style === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "style"},message:"must have required property '"+"style"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.transcript === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "transcript"},message:"must have required property '"+"transcript"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.transcriptJob === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "transcriptJob"},message:"must have required property '"+"transcriptJob"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
if(data.timeline === undefined){
const err9 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "timeline"},message:"must have required property '"+"timeline"+"'"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
if(data.captions === undefined){
const err10 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "captions"},message:"must have required property '"+"captions"+"'"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
if(data.proposals === undefined){
const err11 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposals"},message:"must have required property '"+"proposals"+"'"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
if(data.corrections === undefined){
const err12 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "corrections"},message:"must have required property '"+"corrections"+"'"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
if(data.styleUpdateProposals === undefined){
const err13 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleUpdateProposals"},message:"must have required property '"+"styleUpdateProposals"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data.seed === undefined){
const err14 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "seed"},message:"must have required property '"+"seed"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema31.properties, key0))){
const err15 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(1 !== data.schemaVersion){
const err16 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err17 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.name !== undefined){
if(typeof data.name !== "string"){
const err18 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
if(data.createdAt !== undefined){
let data3 = data.createdAt;
if(typeof data3 === "string"){
if(!(formats0.validate(data3))){
const err19 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
else {
const err20 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.updatedAt !== undefined){
let data4 = data.updatedAt;
if(typeof data4 === "string"){
if(!(formats0.validate(data4))){
const err21 = {instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
else {
const err22 = {instancePath:instancePath+"/updatedAt",schemaPath:"#/properties/updatedAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data.seed !== undefined){
let data5 = data.seed;
if(!((typeof data5 == "number") && (!(data5 % 1) && !isNaN(data5)))){
const err23 = {instancePath:instancePath+"/seed",schemaPath:"#/properties/seed/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data.source !== undefined){
let data6 = data.source;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.id === undefined){
const err24 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(data6.path === undefined){
const err25 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
if(data6.fileName === undefined){
const err26 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "fileName"},message:"must have required property '"+"fileName"+"'"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
if(data6.hash === undefined){
const err27 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "hash"},message:"must have required property '"+"hash"+"'"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
if(data6.durationUs === undefined){
const err28 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "durationUs"},message:"must have required property '"+"durationUs"+"'"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
if(data6.frameCount === undefined){
const err29 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "frameCount"},message:"must have required property '"+"frameCount"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data6.fps === undefined){
const err30 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "fps"},message:"must have required property '"+"fps"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data6.width === undefined){
const err31 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "width"},message:"must have required property '"+"width"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data6.height === undefined){
const err32 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "height"},message:"must have required property '"+"height"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data6.hasAudio === undefined){
const err33 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/required",keyword:"required",params:{missingProperty: "hasAudio"},message:"must have required property '"+"hasAudio"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
for(const key1 in data6){
if(!(func1.call(schema31.properties.source.properties, key1))){
const err34 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
if(data6.id !== undefined){
if(typeof data6.id !== "string"){
const err35 = {instancePath:instancePath+"/source/id",schemaPath:"#/properties/source/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
}
if(data6.path !== undefined){
if(typeof data6.path !== "string"){
const err36 = {instancePath:instancePath+"/source/path",schemaPath:"#/properties/source/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data6.fileName !== undefined){
if(typeof data6.fileName !== "string"){
const err37 = {instancePath:instancePath+"/source/fileName",schemaPath:"#/properties/source/properties/fileName/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data6.hash !== undefined){
if(typeof data6.hash !== "string"){
const err38 = {instancePath:instancePath+"/source/hash",schemaPath:"#/properties/source/properties/hash/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data6.durationUs !== undefined){
let data11 = data6.durationUs;
if(!((typeof data11 == "number") && (!(data11 % 1) && !isNaN(data11)))){
const err39 = {instancePath:instancePath+"/source/durationUs",schemaPath:"#/properties/source/properties/durationUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(typeof data11 == "number"){
if(data11 > 900000000 || isNaN(data11)){
const err40 = {instancePath:instancePath+"/source/durationUs",schemaPath:"#/properties/source/properties/durationUs/maximum",keyword:"maximum",params:{comparison: "<=", limit: 900000000},message:"must be <= 900000000"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data11 < 0 || isNaN(data11)){
const err41 = {instancePath:instancePath+"/source/durationUs",schemaPath:"#/properties/source/properties/durationUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
}
if(data6.fps !== undefined){
let data12 = data6.fps;
if(data12 && typeof data12 == "object" && !Array.isArray(data12)){
if(data12.num === undefined){
const err42 = {instancePath:instancePath+"/source/fps",schemaPath:"#/$defs/rational/required",keyword:"required",params:{missingProperty: "num"},message:"must have required property '"+"num"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data12.den === undefined){
const err43 = {instancePath:instancePath+"/source/fps",schemaPath:"#/$defs/rational/required",keyword:"required",params:{missingProperty: "den"},message:"must have required property '"+"den"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
for(const key2 in data12){
if(!((key2 === "num") || (key2 === "den"))){
const err44 = {instancePath:instancePath+"/source/fps",schemaPath:"#/$defs/rational/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
}
if(data12.num !== undefined){
let data13 = data12.num;
if(!((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13)))){
const err45 = {instancePath:instancePath+"/source/fps/num",schemaPath:"#/$defs/rational/properties/num/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(typeof data13 == "number"){
if(data13 < 1 || isNaN(data13)){
const err46 = {instancePath:instancePath+"/source/fps/num",schemaPath:"#/$defs/rational/properties/num/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
}
if(data12.den !== undefined){
let data14 = data12.den;
if(!((typeof data14 == "number") && (!(data14 % 1) && !isNaN(data14)))){
const err47 = {instancePath:instancePath+"/source/fps/den",schemaPath:"#/$defs/rational/properties/den/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(typeof data14 == "number"){
if(data14 < 1 || isNaN(data14)){
const err48 = {instancePath:instancePath+"/source/fps/den",schemaPath:"#/$defs/rational/properties/den/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
}
}
else {
const err49 = {instancePath:instancePath+"/source/fps",schemaPath:"#/$defs/rational/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
if(data6.sourceIsVfr !== undefined){
if(typeof data6.sourceIsVfr !== "boolean"){
const err50 = {instancePath:instancePath+"/source/sourceIsVfr",schemaPath:"#/properties/source/properties/sourceIsVfr/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data6.frameCount !== undefined){
let data16 = data6.frameCount;
if(!((typeof data16 == "number") && (!(data16 % 1) && !isNaN(data16)))){
const err51 = {instancePath:instancePath+"/source/frameCount",schemaPath:"#/properties/source/properties/frameCount/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
if(typeof data16 == "number"){
if(data16 < 1 || isNaN(data16)){
const err52 = {instancePath:instancePath+"/source/frameCount",schemaPath:"#/properties/source/properties/frameCount/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
}
if(data6.rotation !== undefined){
let data17 = data6.rotation;
if(!((typeof data17 == "number") && (!(data17 % 1) && !isNaN(data17)))){
const err53 = {instancePath:instancePath+"/source/rotation",schemaPath:"#/properties/source/properties/rotation/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data6.width !== undefined){
let data18 = data6.width;
if(!((typeof data18 == "number") && (!(data18 % 1) && !isNaN(data18)))){
const err54 = {instancePath:instancePath+"/source/width",schemaPath:"#/properties/source/properties/width/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
if(data6.height !== undefined){
let data19 = data6.height;
if(!((typeof data19 == "number") && (!(data19 % 1) && !isNaN(data19)))){
const err55 = {instancePath:instancePath+"/source/height",schemaPath:"#/properties/source/properties/height/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
}
if(data6.hasAudio !== undefined){
if(typeof data6.hasAudio !== "boolean"){
const err56 = {instancePath:instancePath+"/source/hasAudio",schemaPath:"#/properties/source/properties/hasAudio/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err56];
}
else {
vErrors.push(err56);
}
errors++;
}
}
if(data6.fileSize !== undefined){
let data21 = data6.fileSize;
if(!((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21)))){
const err57 = {instancePath:instancePath+"/source/fileSize",schemaPath:"#/properties/source/properties/fileSize/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err57];
}
else {
vErrors.push(err57);
}
errors++;
}
}
if(data6.mtime !== undefined){
if(typeof data6.mtime !== "string"){
const err58 = {instancePath:instancePath+"/source/mtime",schemaPath:"#/properties/source/properties/mtime/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err58];
}
else {
vErrors.push(err58);
}
errors++;
}
}
if(data6.container !== undefined){
if(typeof data6.container !== "string"){
const err59 = {instancePath:instancePath+"/source/container",schemaPath:"#/properties/source/properties/container/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err59];
}
else {
vErrors.push(err59);
}
errors++;
}
}
if(data6.videoCodec !== undefined){
if(typeof data6.videoCodec !== "string"){
const err60 = {instancePath:instancePath+"/source/videoCodec",schemaPath:"#/properties/source/properties/videoCodec/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err60];
}
else {
vErrors.push(err60);
}
errors++;
}
}
if(data6.audioCodec !== undefined){
if(typeof data6.audioCodec !== "string"){
const err61 = {instancePath:instancePath+"/source/audioCodec",schemaPath:"#/properties/source/properties/audioCodec/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err61];
}
else {
vErrors.push(err61);
}
errors++;
}
}
}
else {
const err62 = {instancePath:instancePath+"/source",schemaPath:"#/properties/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err62];
}
else {
vErrors.push(err62);
}
errors++;
}
}
if(data.style !== undefined){
let data26 = data.style;
if(data26 && typeof data26 == "object" && !Array.isArray(data26)){
if(data26.styleId === undefined){
const err63 = {instancePath:instancePath+"/style",schemaPath:"#/properties/style/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err63];
}
else {
vErrors.push(err63);
}
errors++;
}
if(data26.version === undefined){
const err64 = {instancePath:instancePath+"/style",schemaPath:"#/properties/style/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err64];
}
else {
vErrors.push(err64);
}
errors++;
}
for(const key3 in data26){
if(!((key3 === "styleId") || (key3 === "version"))){
const err65 = {instancePath:instancePath+"/style",schemaPath:"#/properties/style/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err65];
}
else {
vErrors.push(err65);
}
errors++;
}
}
if(data26.styleId !== undefined){
if(typeof data26.styleId !== "string"){
const err66 = {instancePath:instancePath+"/style/styleId",schemaPath:"#/properties/style/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err66];
}
else {
vErrors.push(err66);
}
errors++;
}
}
if(data26.version !== undefined){
let data28 = data26.version;
if(!((typeof data28 == "number") && (!(data28 % 1) && !isNaN(data28)))){
const err67 = {instancePath:instancePath+"/style/version",schemaPath:"#/properties/style/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err67];
}
else {
vErrors.push(err67);
}
errors++;
}
if(typeof data28 == "number"){
if(data28 < 1 || isNaN(data28)){
const err68 = {instancePath:instancePath+"/style/version",schemaPath:"#/properties/style/properties/version/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err68];
}
else {
vErrors.push(err68);
}
errors++;
}
}
}
}
else {
const err69 = {instancePath:instancePath+"/style",schemaPath:"#/properties/style/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err69];
}
else {
vErrors.push(err69);
}
errors++;
}
}
if(data.transcript !== undefined){
let data29 = data.transcript;
const _errs64 = errors;
let valid5 = false;
let passing0 = null;
const _errs65 = errors;
if(data29 !== null){
const err70 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/0/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err70];
}
else {
vErrors.push(err70);
}
errors++;
}
var _valid0 = _errs65 === errors;
if(_valid0){
valid5 = true;
passing0 = 0;
}
const _errs67 = errors;
if(data29 && typeof data29 == "object" && !Array.isArray(data29)){
if(data29.schemaVersion === undefined){
const err71 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err71];
}
else {
vErrors.push(err71);
}
errors++;
}
if(data29.provider === undefined){
const err72 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "provider"},message:"must have required property '"+"provider"+"'"};
if(vErrors === null){
vErrors = [err72];
}
else {
vErrors.push(err72);
}
errors++;
}
if(data29.model === undefined){
const err73 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "model"},message:"must have required property '"+"model"+"'"};
if(vErrors === null){
vErrors = [err73];
}
else {
vErrors.push(err73);
}
errors++;
}
if(data29.modelParams === undefined){
const err74 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "modelParams"},message:"must have required property '"+"modelParams"+"'"};
if(vErrors === null){
vErrors = [err74];
}
else {
vErrors.push(err74);
}
errors++;
}
if(data29.language === undefined){
const err75 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "language"},message:"must have required property '"+"language"+"'"};
if(vErrors === null){
vErrors = [err75];
}
else {
vErrors.push(err75);
}
errors++;
}
if(data29.durationUs === undefined){
const err76 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "durationUs"},message:"must have required property '"+"durationUs"+"'"};
if(vErrors === null){
vErrors = [err76];
}
else {
vErrors.push(err76);
}
errors++;
}
if(data29.audioSha256 === undefined){
const err77 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "audioSha256"},message:"must have required property '"+"audioSha256"+"'"};
if(vErrors === null){
vErrors = [err77];
}
else {
vErrors.push(err77);
}
errors++;
}
if(data29.words === undefined){
const err78 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "words"},message:"must have required property '"+"words"+"'"};
if(vErrors === null){
vErrors = [err78];
}
else {
vErrors.push(err78);
}
errors++;
}
if(data29.createdAt === undefined){
const err79 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/required",keyword:"required",params:{missingProperty: "createdAt"},message:"must have required property '"+"createdAt"+"'"};
if(vErrors === null){
vErrors = [err79];
}
else {
vErrors.push(err79);
}
errors++;
}
for(const key4 in data29){
if(!(func1.call(schema31.properties.transcript.oneOf[1].properties, key4))){
const err80 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key4},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err80];
}
else {
vErrors.push(err80);
}
errors++;
}
}
if(data29.schemaVersion !== undefined){
if(1 !== data29.schemaVersion){
const err81 = {instancePath:instancePath+"/transcript/schemaVersion",schemaPath:"#/properties/transcript/oneOf/1/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err81];
}
else {
vErrors.push(err81);
}
errors++;
}
}
if(data29.provider !== undefined){
if(typeof data29.provider !== "string"){
const err82 = {instancePath:instancePath+"/transcript/provider",schemaPath:"#/properties/transcript/oneOf/1/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err82];
}
else {
vErrors.push(err82);
}
errors++;
}
}
if(data29.model !== undefined){
if(typeof data29.model !== "string"){
const err83 = {instancePath:instancePath+"/transcript/model",schemaPath:"#/properties/transcript/oneOf/1/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err83];
}
else {
vErrors.push(err83);
}
errors++;
}
}
if(data29.modelParams !== undefined){
let data33 = data29.modelParams;
if(!(data33 && typeof data33 == "object" && !Array.isArray(data33))){
const err84 = {instancePath:instancePath+"/transcript/modelParams",schemaPath:"#/properties/transcript/oneOf/1/properties/modelParams/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err84];
}
else {
vErrors.push(err84);
}
errors++;
}
}
if(data29.audioSha256 !== undefined){
if(typeof data29.audioSha256 !== "string"){
const err85 = {instancePath:instancePath+"/transcript/audioSha256",schemaPath:"#/properties/transcript/oneOf/1/properties/audioSha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err85];
}
else {
vErrors.push(err85);
}
errors++;
}
}
if(data29.language !== undefined){
if(typeof data29.language !== "string"){
const err86 = {instancePath:instancePath+"/transcript/language",schemaPath:"#/properties/transcript/oneOf/1/properties/language/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err86];
}
else {
vErrors.push(err86);
}
errors++;
}
}
if(data29.durationUs !== undefined){
let data36 = data29.durationUs;
if(!((typeof data36 == "number") && (!(data36 % 1) && !isNaN(data36)))){
const err87 = {instancePath:instancePath+"/transcript/durationUs",schemaPath:"#/properties/transcript/oneOf/1/properties/durationUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err87];
}
else {
vErrors.push(err87);
}
errors++;
}
if(typeof data36 == "number"){
if(data36 < 0 || isNaN(data36)){
const err88 = {instancePath:instancePath+"/transcript/durationUs",schemaPath:"#/properties/transcript/oneOf/1/properties/durationUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err88];
}
else {
vErrors.push(err88);
}
errors++;
}
}
}
if(data29.createdAt !== undefined){
let data37 = data29.createdAt;
if(typeof data37 === "string"){
if(!(formats0.validate(data37))){
const err89 = {instancePath:instancePath+"/transcript/createdAt",schemaPath:"#/properties/transcript/oneOf/1/properties/createdAt/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err89];
}
else {
vErrors.push(err89);
}
errors++;
}
}
else {
const err90 = {instancePath:instancePath+"/transcript/createdAt",schemaPath:"#/properties/transcript/oneOf/1/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err90];
}
else {
vErrors.push(err90);
}
errors++;
}
}
if(data29.words !== undefined){
let data38 = data29.words;
if(Array.isArray(data38)){
const len0 = data38.length;
for(let i0=0; i0<len0; i0++){
let data39 = data38[i0];
if(data39 && typeof data39 == "object" && !Array.isArray(data39)){
if(data39.id === undefined){
const err91 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err91];
}
else {
vErrors.push(err91);
}
errors++;
}
if(data39.text === undefined){
const err92 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err92];
}
else {
vErrors.push(err92);
}
errors++;
}
if(data39.startUs === undefined){
const err93 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/required",keyword:"required",params:{missingProperty: "startUs"},message:"must have required property '"+"startUs"+"'"};
if(vErrors === null){
vErrors = [err93];
}
else {
vErrors.push(err93);
}
errors++;
}
if(data39.endUs === undefined){
const err94 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/required",keyword:"required",params:{missingProperty: "endUs"},message:"must have required property '"+"endUs"+"'"};
if(vErrors === null){
vErrors = [err94];
}
else {
vErrors.push(err94);
}
errors++;
}
if(data39.confidence === undefined){
const err95 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/required",keyword:"required",params:{missingProperty: "confidence"},message:"must have required property '"+"confidence"+"'"};
if(vErrors === null){
vErrors = [err95];
}
else {
vErrors.push(err95);
}
errors++;
}
for(const key5 in data39){
if(!((((((((key5 === "id") || (key5 === "text")) || (key5 === "startUs")) || (key5 === "endUs")) || (key5 === "confidence")) || (key5 === "lang")) || (key5 === "original")) || (key5 === "correctedBy"))){
const err96 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key5},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err96];
}
else {
vErrors.push(err96);
}
errors++;
}
}
if(data39.id !== undefined){
if(typeof data39.id !== "string"){
const err97 = {instancePath:instancePath+"/transcript/words/" + i0+"/id",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err97];
}
else {
vErrors.push(err97);
}
errors++;
}
}
if(data39.text !== undefined){
let data41 = data39.text;
if(typeof data41 === "string"){
if(func4(data41) < 1){
const err98 = {instancePath:instancePath+"/transcript/words/" + i0+"/text",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err98];
}
else {
vErrors.push(err98);
}
errors++;
}
}
else {
const err99 = {instancePath:instancePath+"/transcript/words/" + i0+"/text",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err99];
}
else {
vErrors.push(err99);
}
errors++;
}
}
if(data39.startUs !== undefined){
let data42 = data39.startUs;
if(!((typeof data42 == "number") && (!(data42 % 1) && !isNaN(data42)))){
const err100 = {instancePath:instancePath+"/transcript/words/" + i0+"/startUs",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/startUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err100];
}
else {
vErrors.push(err100);
}
errors++;
}
if(typeof data42 == "number"){
if(data42 < 0 || isNaN(data42)){
const err101 = {instancePath:instancePath+"/transcript/words/" + i0+"/startUs",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/startUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err101];
}
else {
vErrors.push(err101);
}
errors++;
}
}
}
if(data39.endUs !== undefined){
let data43 = data39.endUs;
if(!((typeof data43 == "number") && (!(data43 % 1) && !isNaN(data43)))){
const err102 = {instancePath:instancePath+"/transcript/words/" + i0+"/endUs",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/endUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err102];
}
else {
vErrors.push(err102);
}
errors++;
}
if(typeof data43 == "number"){
if(data43 < 0 || isNaN(data43)){
const err103 = {instancePath:instancePath+"/transcript/words/" + i0+"/endUs",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/endUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err103];
}
else {
vErrors.push(err103);
}
errors++;
}
}
}
if(data39.confidence !== undefined){
let data44 = data39.confidence;
const _errs99 = errors;
let valid10 = false;
let passing1 = null;
const _errs100 = errors;
if(typeof data44 == "number"){
if(data44 > 1 || isNaN(data44)){
const err104 = {instancePath:instancePath+"/transcript/words/" + i0+"/confidence",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/confidence/oneOf/0/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err104];
}
else {
vErrors.push(err104);
}
errors++;
}
if(data44 < 0 || isNaN(data44)){
const err105 = {instancePath:instancePath+"/transcript/words/" + i0+"/confidence",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/confidence/oneOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err105];
}
else {
vErrors.push(err105);
}
errors++;
}
}
else {
const err106 = {instancePath:instancePath+"/transcript/words/" + i0+"/confidence",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/confidence/oneOf/0/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err106];
}
else {
vErrors.push(err106);
}
errors++;
}
var _valid1 = _errs100 === errors;
if(_valid1){
valid10 = true;
passing1 = 0;
}
const _errs102 = errors;
if(data44 !== null){
const err107 = {instancePath:instancePath+"/transcript/words/" + i0+"/confidence",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/confidence/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err107];
}
else {
vErrors.push(err107);
}
errors++;
}
var _valid1 = _errs102 === errors;
if(_valid1 && valid10){
valid10 = false;
passing1 = [passing1, 1];
}
else {
if(_valid1){
valid10 = true;
passing1 = 1;
}
}
if(!valid10){
const err108 = {instancePath:instancePath+"/transcript/words/" + i0+"/confidence",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/confidence/oneOf",keyword:"oneOf",params:{passingSchemas: passing1},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err108];
}
else {
vErrors.push(err108);
}
errors++;
}
else {
errors = _errs99;
if(vErrors !== null){
if(_errs99){
vErrors.length = _errs99;
}
else {
vErrors = null;
}
}
}
}
if(data39.lang !== undefined){
if(typeof data39.lang !== "string"){
const err109 = {instancePath:instancePath+"/transcript/words/" + i0+"/lang",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/lang/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err109];
}
else {
vErrors.push(err109);
}
errors++;
}
}
if(data39.original !== undefined){
if(typeof data39.original !== "string"){
const err110 = {instancePath:instancePath+"/transcript/words/" + i0+"/original",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/original/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err110];
}
else {
vErrors.push(err110);
}
errors++;
}
}
if(data39.correctedBy !== undefined){
let data47 = data39.correctedBy;
if(!((data47 === "user") || (data47 === "auto"))){
const err111 = {instancePath:instancePath+"/transcript/words/" + i0+"/correctedBy",schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/properties/correctedBy/enum",keyword:"enum",params:{allowedValues: schema31.properties.transcript.oneOf[1].properties.words.items.properties.correctedBy.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err111];
}
else {
vErrors.push(err111);
}
errors++;
}
}
}
else {
const err112 = {instancePath:instancePath+"/transcript/words/" + i0,schemaPath:"#/properties/transcript/oneOf/1/properties/words/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err112];
}
else {
vErrors.push(err112);
}
errors++;
}
}
}
else {
const err113 = {instancePath:instancePath+"/transcript/words",schemaPath:"#/properties/transcript/oneOf/1/properties/words/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err113];
}
else {
vErrors.push(err113);
}
errors++;
}
}
if(data29.segments !== undefined){
let data48 = data29.segments;
if(Array.isArray(data48)){
const len1 = data48.length;
for(let i1=0; i1<len1; i1++){
let data49 = data48[i1];
if(data49 && typeof data49 == "object" && !Array.isArray(data49)){
if(data49.startUs === undefined){
const err114 = {instancePath:instancePath+"/transcript/segments/" + i1,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/required",keyword:"required",params:{missingProperty: "startUs"},message:"must have required property '"+"startUs"+"'"};
if(vErrors === null){
vErrors = [err114];
}
else {
vErrors.push(err114);
}
errors++;
}
if(data49.endUs === undefined){
const err115 = {instancePath:instancePath+"/transcript/segments/" + i1,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/required",keyword:"required",params:{missingProperty: "endUs"},message:"must have required property '"+"endUs"+"'"};
if(vErrors === null){
vErrors = [err115];
}
else {
vErrors.push(err115);
}
errors++;
}
if(data49.wordIds === undefined){
const err116 = {instancePath:instancePath+"/transcript/segments/" + i1,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/required",keyword:"required",params:{missingProperty: "wordIds"},message:"must have required property '"+"wordIds"+"'"};
if(vErrors === null){
vErrors = [err116];
}
else {
vErrors.push(err116);
}
errors++;
}
for(const key6 in data49){
if(!((((key6 === "startUs") || (key6 === "endUs")) || (key6 === "wordIds")) || (key6 === "text"))){
const err117 = {instancePath:instancePath+"/transcript/segments/" + i1,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key6},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err117];
}
else {
vErrors.push(err117);
}
errors++;
}
}
if(data49.startUs !== undefined){
let data50 = data49.startUs;
if(!((typeof data50 == "number") && (!(data50 % 1) && !isNaN(data50)))){
const err118 = {instancePath:instancePath+"/transcript/segments/" + i1+"/startUs",schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/properties/startUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err118];
}
else {
vErrors.push(err118);
}
errors++;
}
}
if(data49.endUs !== undefined){
let data51 = data49.endUs;
if(!((typeof data51 == "number") && (!(data51 % 1) && !isNaN(data51)))){
const err119 = {instancePath:instancePath+"/transcript/segments/" + i1+"/endUs",schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/properties/endUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err119];
}
else {
vErrors.push(err119);
}
errors++;
}
}
if(data49.wordIds !== undefined){
let data52 = data49.wordIds;
if(Array.isArray(data52)){
const len2 = data52.length;
for(let i2=0; i2<len2; i2++){
if(typeof data52[i2] !== "string"){
const err120 = {instancePath:instancePath+"/transcript/segments/" + i1+"/wordIds/" + i2,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/properties/wordIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err120];
}
else {
vErrors.push(err120);
}
errors++;
}
}
}
else {
const err121 = {instancePath:instancePath+"/transcript/segments/" + i1+"/wordIds",schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/properties/wordIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err121];
}
else {
vErrors.push(err121);
}
errors++;
}
}
if(data49.text !== undefined){
if(typeof data49.text !== "string"){
const err122 = {instancePath:instancePath+"/transcript/segments/" + i1+"/text",schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err122];
}
else {
vErrors.push(err122);
}
errors++;
}
}
}
else {
const err123 = {instancePath:instancePath+"/transcript/segments/" + i1,schemaPath:"#/properties/transcript/oneOf/1/properties/segments/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err123];
}
else {
vErrors.push(err123);
}
errors++;
}
}
}
else {
const err124 = {instancePath:instancePath+"/transcript/segments",schemaPath:"#/properties/transcript/oneOf/1/properties/segments/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err124];
}
else {
vErrors.push(err124);
}
errors++;
}
}
if(data29.rawRef !== undefined){
if(typeof data29.rawRef !== "string"){
const err125 = {instancePath:instancePath+"/transcript/rawRef",schemaPath:"#/properties/transcript/oneOf/1/properties/rawRef/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err125];
}
else {
vErrors.push(err125);
}
errors++;
}
}
}
else {
const err126 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf/1/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err126];
}
else {
vErrors.push(err126);
}
errors++;
}
var _valid0 = _errs67 === errors;
if(_valid0 && valid5){
valid5 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid5 = true;
passing0 = 1;
}
}
if(!valid5){
const err127 = {instancePath:instancePath+"/transcript",schemaPath:"#/properties/transcript/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err127];
}
else {
vErrors.push(err127);
}
errors++;
}
else {
errors = _errs64;
if(vErrors !== null){
if(_errs64){
vErrors.length = _errs64;
}
else {
vErrors = null;
}
}
}
}
if(data.transcriptJob !== undefined){
let data56 = data.transcriptJob;
if(data56 && typeof data56 == "object" && !Array.isArray(data56)){
if(data56.state === undefined){
const err128 = {instancePath:instancePath+"/transcriptJob",schemaPath:"#/properties/transcriptJob/required",keyword:"required",params:{missingProperty: "state"},message:"must have required property '"+"state"+"'"};
if(vErrors === null){
vErrors = [err128];
}
else {
vErrors.push(err128);
}
errors++;
}
for(const key7 in data56){
if(!((((((((key7 === "state") || (key7 === "provider")) || (key7 === "model")) || (key7 === "progress")) || (key7 === "audioHash")) || (key7 === "error")) || (key7 === "startedAt")) || (key7 === "finishedAt"))){
const err129 = {instancePath:instancePath+"/transcriptJob",schemaPath:"#/properties/transcriptJob/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key7},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err129];
}
else {
vErrors.push(err129);
}
errors++;
}
}
if(data56.state !== undefined){
let data57 = data56.state;
if(!((((((data57 === "idle") || (data57 === "extracting_audio")) || (data57 === "uploading")) || (data57 === "transcribing")) || (data57 === "done")) || (data57 === "failed"))){
const err130 = {instancePath:instancePath+"/transcriptJob/state",schemaPath:"#/properties/transcriptJob/properties/state/enum",keyword:"enum",params:{allowedValues: schema31.properties.transcriptJob.properties.state.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err130];
}
else {
vErrors.push(err130);
}
errors++;
}
}
if(data56.provider !== undefined){
if(typeof data56.provider !== "string"){
const err131 = {instancePath:instancePath+"/transcriptJob/provider",schemaPath:"#/properties/transcriptJob/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err131];
}
else {
vErrors.push(err131);
}
errors++;
}
}
if(data56.model !== undefined){
if(typeof data56.model !== "string"){
const err132 = {instancePath:instancePath+"/transcriptJob/model",schemaPath:"#/properties/transcriptJob/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err132];
}
else {
vErrors.push(err132);
}
errors++;
}
}
if(data56.progress !== undefined){
let data60 = data56.progress;
if(typeof data60 == "number"){
if(data60 > 1 || isNaN(data60)){
const err133 = {instancePath:instancePath+"/transcriptJob/progress",schemaPath:"#/properties/transcriptJob/properties/progress/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err133];
}
else {
vErrors.push(err133);
}
errors++;
}
if(data60 < 0 || isNaN(data60)){
const err134 = {instancePath:instancePath+"/transcriptJob/progress",schemaPath:"#/properties/transcriptJob/properties/progress/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err134];
}
else {
vErrors.push(err134);
}
errors++;
}
}
else {
const err135 = {instancePath:instancePath+"/transcriptJob/progress",schemaPath:"#/properties/transcriptJob/properties/progress/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err135];
}
else {
vErrors.push(err135);
}
errors++;
}
}
if(data56.audioHash !== undefined){
if(typeof data56.audioHash !== "string"){
const err136 = {instancePath:instancePath+"/transcriptJob/audioHash",schemaPath:"#/properties/transcriptJob/properties/audioHash/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err136];
}
else {
vErrors.push(err136);
}
errors++;
}
}
if(data56.error !== undefined){
if(typeof data56.error !== "string"){
const err137 = {instancePath:instancePath+"/transcriptJob/error",schemaPath:"#/properties/transcriptJob/properties/error/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err137];
}
else {
vErrors.push(err137);
}
errors++;
}
}
if(data56.startedAt !== undefined){
if(typeof data56.startedAt !== "string"){
const err138 = {instancePath:instancePath+"/transcriptJob/startedAt",schemaPath:"#/properties/transcriptJob/properties/startedAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err138];
}
else {
vErrors.push(err138);
}
errors++;
}
}
if(data56.finishedAt !== undefined){
if(typeof data56.finishedAt !== "string"){
const err139 = {instancePath:instancePath+"/transcriptJob/finishedAt",schemaPath:"#/properties/transcriptJob/properties/finishedAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err139];
}
else {
vErrors.push(err139);
}
errors++;
}
}
}
else {
const err140 = {instancePath:instancePath+"/transcriptJob",schemaPath:"#/properties/transcriptJob/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err140];
}
else {
vErrors.push(err140);
}
errors++;
}
}
if(data.timeline !== undefined){
let data65 = data.timeline;
if(data65 && typeof data65 == "object" && !Array.isArray(data65)){
if(data65.clips === undefined){
const err141 = {instancePath:instancePath+"/timeline",schemaPath:"#/properties/timeline/required",keyword:"required",params:{missingProperty: "clips"},message:"must have required property '"+"clips"+"'"};
if(vErrors === null){
vErrors = [err141];
}
else {
vErrors.push(err141);
}
errors++;
}
for(const key8 in data65){
if(!(key8 === "clips")){
const err142 = {instancePath:instancePath+"/timeline",schemaPath:"#/properties/timeline/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key8},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err142];
}
else {
vErrors.push(err142);
}
errors++;
}
}
if(data65.clips !== undefined){
let data66 = data65.clips;
if(Array.isArray(data66)){
const len3 = data66.length;
for(let i3=0; i3<len3; i3++){
let data67 = data66[i3];
if(data67 && typeof data67 == "object" && !Array.isArray(data67)){
if(data67.id === undefined){
const err143 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err143];
}
else {
vErrors.push(err143);
}
errors++;
}
if(data67.sourceId === undefined){
const err144 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/required",keyword:"required",params:{missingProperty: "sourceId"},message:"must have required property '"+"sourceId"+"'"};
if(vErrors === null){
vErrors = [err144];
}
else {
vErrors.push(err144);
}
errors++;
}
if(data67.inFrame === undefined){
const err145 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/required",keyword:"required",params:{missingProperty: "inFrame"},message:"must have required property '"+"inFrame"+"'"};
if(vErrors === null){
vErrors = [err145];
}
else {
vErrors.push(err145);
}
errors++;
}
if(data67.outFrame === undefined){
const err146 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/required",keyword:"required",params:{missingProperty: "outFrame"},message:"must have required property '"+"outFrame"+"'"};
if(vErrors === null){
vErrors = [err146];
}
else {
vErrors.push(err146);
}
errors++;
}
if(data67.timelineStartFrame === undefined){
const err147 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/required",keyword:"required",params:{missingProperty: "timelineStartFrame"},message:"must have required property '"+"timelineStartFrame"+"'"};
if(vErrors === null){
vErrors = [err147];
}
else {
vErrors.push(err147);
}
errors++;
}
for(const key9 in data67){
if(!((((((key9 === "id") || (key9 === "sourceId")) || (key9 === "inFrame")) || (key9 === "outFrame")) || (key9 === "timelineStartFrame")) || (key9 === "label"))){
const err148 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key9},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err148];
}
else {
vErrors.push(err148);
}
errors++;
}
}
if(data67.id !== undefined){
if(typeof data67.id !== "string"){
const err149 = {instancePath:instancePath+"/timeline/clips/" + i3+"/id",schemaPath:"#/properties/timeline/properties/clips/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err149];
}
else {
vErrors.push(err149);
}
errors++;
}
}
if(data67.sourceId !== undefined){
if(typeof data67.sourceId !== "string"){
const err150 = {instancePath:instancePath+"/timeline/clips/" + i3+"/sourceId",schemaPath:"#/properties/timeline/properties/clips/items/properties/sourceId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err150];
}
else {
vErrors.push(err150);
}
errors++;
}
}
if(data67.inFrame !== undefined){
let data70 = data67.inFrame;
if(!((typeof data70 == "number") && (!(data70 % 1) && !isNaN(data70)))){
const err151 = {instancePath:instancePath+"/timeline/clips/" + i3+"/inFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/inFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err151];
}
else {
vErrors.push(err151);
}
errors++;
}
if(typeof data70 == "number"){
if(data70 < 0 || isNaN(data70)){
const err152 = {instancePath:instancePath+"/timeline/clips/" + i3+"/inFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/inFrame/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err152];
}
else {
vErrors.push(err152);
}
errors++;
}
}
}
if(data67.outFrame !== undefined){
let data71 = data67.outFrame;
if(!((typeof data71 == "number") && (!(data71 % 1) && !isNaN(data71)))){
const err153 = {instancePath:instancePath+"/timeline/clips/" + i3+"/outFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/outFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err153];
}
else {
vErrors.push(err153);
}
errors++;
}
if(typeof data71 == "number"){
if(data71 < 0 || isNaN(data71)){
const err154 = {instancePath:instancePath+"/timeline/clips/" + i3+"/outFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/outFrame/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err154];
}
else {
vErrors.push(err154);
}
errors++;
}
}
}
if(data67.timelineStartFrame !== undefined){
let data72 = data67.timelineStartFrame;
if(!((typeof data72 == "number") && (!(data72 % 1) && !isNaN(data72)))){
const err155 = {instancePath:instancePath+"/timeline/clips/" + i3+"/timelineStartFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/timelineStartFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err155];
}
else {
vErrors.push(err155);
}
errors++;
}
if(typeof data72 == "number"){
if(data72 < 0 || isNaN(data72)){
const err156 = {instancePath:instancePath+"/timeline/clips/" + i3+"/timelineStartFrame",schemaPath:"#/properties/timeline/properties/clips/items/properties/timelineStartFrame/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err156];
}
else {
vErrors.push(err156);
}
errors++;
}
}
}
if(data67.label !== undefined){
if(typeof data67.label !== "string"){
const err157 = {instancePath:instancePath+"/timeline/clips/" + i3+"/label",schemaPath:"#/properties/timeline/properties/clips/items/properties/label/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err157];
}
else {
vErrors.push(err157);
}
errors++;
}
}
}
else {
const err158 = {instancePath:instancePath+"/timeline/clips/" + i3,schemaPath:"#/properties/timeline/properties/clips/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err158];
}
else {
vErrors.push(err158);
}
errors++;
}
}
}
else {
const err159 = {instancePath:instancePath+"/timeline/clips",schemaPath:"#/properties/timeline/properties/clips/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err159];
}
else {
vErrors.push(err159);
}
errors++;
}
}
}
else {
const err160 = {instancePath:instancePath+"/timeline",schemaPath:"#/properties/timeline/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err160];
}
else {
vErrors.push(err160);
}
errors++;
}
}
if(data.captions !== undefined){
let data74 = data.captions;
if(data74 && typeof data74 == "object" && !Array.isArray(data74)){
if(data74.enabled === undefined){
const err161 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "enabled"},message:"must have required property '"+"enabled"+"'"};
if(vErrors === null){
vErrors = [err161];
}
else {
vErrors.push(err161);
}
errors++;
}
if(data74.cues === undefined){
const err162 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "cues"},message:"must have required property '"+"cues"+"'"};
if(vErrors === null){
vErrors = [err162];
}
else {
vErrors.push(err162);
}
errors++;
}
for(const key10 in data74){
if(!((key10 === "enabled") || (key10 === "cues"))){
const err163 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key10},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err163];
}
else {
vErrors.push(err163);
}
errors++;
}
}
if(data74.enabled !== undefined){
if(typeof data74.enabled !== "boolean"){
const err164 = {instancePath:instancePath+"/captions/enabled",schemaPath:"#/properties/captions/properties/enabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err164];
}
else {
vErrors.push(err164);
}
errors++;
}
}
if(data74.cues !== undefined){
let data76 = data74.cues;
if(Array.isArray(data76)){
const len4 = data76.length;
for(let i4=0; i4<len4; i4++){
let data77 = data76[i4];
if(data77 && typeof data77 == "object" && !Array.isArray(data77)){
if(data77.id === undefined){
const err165 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err165];
}
else {
vErrors.push(err165);
}
errors++;
}
if(data77.startFrame === undefined){
const err166 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "startFrame"},message:"must have required property '"+"startFrame"+"'"};
if(vErrors === null){
vErrors = [err166];
}
else {
vErrors.push(err166);
}
errors++;
}
if(data77.endFrame === undefined){
const err167 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "endFrame"},message:"must have required property '"+"endFrame"+"'"};
if(vErrors === null){
vErrors = [err167];
}
else {
vErrors.push(err167);
}
errors++;
}
if(data77.wordIds === undefined){
const err168 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "wordIds"},message:"must have required property '"+"wordIds"+"'"};
if(vErrors === null){
vErrors = [err168];
}
else {
vErrors.push(err168);
}
errors++;
}
if(data77.lines === undefined){
const err169 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "lines"},message:"must have required property '"+"lines"+"'"};
if(vErrors === null){
vErrors = [err169];
}
else {
vErrors.push(err169);
}
errors++;
}
if(data77.fontSizePx === undefined){
const err170 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/required",keyword:"required",params:{missingProperty: "fontSizePx"},message:"must have required property '"+"fontSizePx"+"'"};
if(vErrors === null){
vErrors = [err170];
}
else {
vErrors.push(err170);
}
errors++;
}
for(const key11 in data77){
if(!(((((((key11 === "id") || (key11 === "startFrame")) || (key11 === "endFrame")) || (key11 === "fontSizePx")) || (key11 === "activeWordRects")) || (key11 === "wordIds")) || (key11 === "lines"))){
const err171 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key11},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err171];
}
else {
vErrors.push(err171);
}
errors++;
}
}
if(data77.id !== undefined){
if(typeof data77.id !== "string"){
const err172 = {instancePath:instancePath+"/captions/cues/" + i4+"/id",schemaPath:"#/properties/captions/properties/cues/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err172];
}
else {
vErrors.push(err172);
}
errors++;
}
}
if(data77.startFrame !== undefined){
let data79 = data77.startFrame;
if(!((typeof data79 == "number") && (!(data79 % 1) && !isNaN(data79)))){
const err173 = {instancePath:instancePath+"/captions/cues/" + i4+"/startFrame",schemaPath:"#/properties/captions/properties/cues/items/properties/startFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err173];
}
else {
vErrors.push(err173);
}
errors++;
}
}
if(data77.endFrame !== undefined){
let data80 = data77.endFrame;
if(!((typeof data80 == "number") && (!(data80 % 1) && !isNaN(data80)))){
const err174 = {instancePath:instancePath+"/captions/cues/" + i4+"/endFrame",schemaPath:"#/properties/captions/properties/cues/items/properties/endFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err174];
}
else {
vErrors.push(err174);
}
errors++;
}
}
if(data77.fontSizePx !== undefined){
let data81 = data77.fontSizePx;
if(!((typeof data81 == "number") && (!(data81 % 1) && !isNaN(data81)))){
const err175 = {instancePath:instancePath+"/captions/cues/" + i4+"/fontSizePx",schemaPath:"#/properties/captions/properties/cues/items/properties/fontSizePx/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err175];
}
else {
vErrors.push(err175);
}
errors++;
}
}
if(data77.activeWordRects !== undefined){
let data82 = data77.activeWordRects;
if(Array.isArray(data82)){
const len5 = data82.length;
for(let i5=0; i5<len5; i5++){
let data83 = data82[i5];
if(Array.isArray(data83)){
if(data83.length > 4){
const err176 = {instancePath:instancePath+"/captions/cues/" + i4+"/activeWordRects/" + i5,schemaPath:"#/properties/captions/properties/cues/items/properties/activeWordRects/items/maxItems",keyword:"maxItems",params:{limit: 4},message:"must NOT have more than 4 items"};
if(vErrors === null){
vErrors = [err176];
}
else {
vErrors.push(err176);
}
errors++;
}
if(data83.length < 4){
const err177 = {instancePath:instancePath+"/captions/cues/" + i4+"/activeWordRects/" + i5,schemaPath:"#/properties/captions/properties/cues/items/properties/activeWordRects/items/minItems",keyword:"minItems",params:{limit: 4},message:"must NOT have fewer than 4 items"};
if(vErrors === null){
vErrors = [err177];
}
else {
vErrors.push(err177);
}
errors++;
}
const len6 = data83.length;
for(let i6=0; i6<len6; i6++){
if(!(typeof data83[i6] == "number")){
const err178 = {instancePath:instancePath+"/captions/cues/" + i4+"/activeWordRects/" + i5+"/" + i6,schemaPath:"#/properties/captions/properties/cues/items/properties/activeWordRects/items/items/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err178];
}
else {
vErrors.push(err178);
}
errors++;
}
}
}
else {
const err179 = {instancePath:instancePath+"/captions/cues/" + i4+"/activeWordRects/" + i5,schemaPath:"#/properties/captions/properties/cues/items/properties/activeWordRects/items/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err179];
}
else {
vErrors.push(err179);
}
errors++;
}
}
}
else {
const err180 = {instancePath:instancePath+"/captions/cues/" + i4+"/activeWordRects",schemaPath:"#/properties/captions/properties/cues/items/properties/activeWordRects/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err180];
}
else {
vErrors.push(err180);
}
errors++;
}
}
if(data77.wordIds !== undefined){
let data85 = data77.wordIds;
if(Array.isArray(data85)){
const len7 = data85.length;
for(let i7=0; i7<len7; i7++){
if(typeof data85[i7] !== "string"){
const err181 = {instancePath:instancePath+"/captions/cues/" + i4+"/wordIds/" + i7,schemaPath:"#/properties/captions/properties/cues/items/properties/wordIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err181];
}
else {
vErrors.push(err181);
}
errors++;
}
}
}
else {
const err182 = {instancePath:instancePath+"/captions/cues/" + i4+"/wordIds",schemaPath:"#/properties/captions/properties/cues/items/properties/wordIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err182];
}
else {
vErrors.push(err182);
}
errors++;
}
}
if(data77.lines !== undefined){
let data87 = data77.lines;
if(Array.isArray(data87)){
const len8 = data87.length;
for(let i8=0; i8<len8; i8++){
if(typeof data87[i8] !== "string"){
const err183 = {instancePath:instancePath+"/captions/cues/" + i4+"/lines/" + i8,schemaPath:"#/properties/captions/properties/cues/items/properties/lines/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err183];
}
else {
vErrors.push(err183);
}
errors++;
}
}
}
else {
const err184 = {instancePath:instancePath+"/captions/cues/" + i4+"/lines",schemaPath:"#/properties/captions/properties/cues/items/properties/lines/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err184];
}
else {
vErrors.push(err184);
}
errors++;
}
}
}
else {
const err185 = {instancePath:instancePath+"/captions/cues/" + i4,schemaPath:"#/properties/captions/properties/cues/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err185];
}
else {
vErrors.push(err185);
}
errors++;
}
}
}
else {
const err186 = {instancePath:instancePath+"/captions/cues",schemaPath:"#/properties/captions/properties/cues/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err186];
}
else {
vErrors.push(err186);
}
errors++;
}
}
}
else {
const err187 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err187];
}
else {
vErrors.push(err187);
}
errors++;
}
}
if(data.proposals !== undefined){
let data89 = data.proposals;
if(Array.isArray(data89)){
const len9 = data89.length;
for(let i9=0; i9<len9; i9++){
if(!(validate21(data89[i9], {instancePath:instancePath+"/proposals/" + i9,parentData:data89,parentDataProperty:i9,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate21.errors : vErrors.concat(validate21.errors);
errors = vErrors.length;
}
}
}
else {
const err188 = {instancePath:instancePath+"/proposals",schemaPath:"#/properties/proposals/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err188];
}
else {
vErrors.push(err188);
}
errors++;
}
}
if(data.corrections !== undefined){
let data91 = data.corrections;
if(Array.isArray(data91)){
const len10 = data91.length;
for(let i10=0; i10<len10; i10++){
if(!(validate23(data91[i10], {instancePath:instancePath+"/corrections/" + i10,parentData:data91,parentDataProperty:i10,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate23.errors : vErrors.concat(validate23.errors);
errors = vErrors.length;
}
}
}
else {
const err189 = {instancePath:instancePath+"/corrections",schemaPath:"#/properties/corrections/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err189];
}
else {
vErrors.push(err189);
}
errors++;
}
}
if(data.styleUpdateProposals !== undefined){
let data93 = data.styleUpdateProposals;
if(Array.isArray(data93)){
const len11 = data93.length;
for(let i11=0; i11<len11; i11++){
if(!(validate25(data93[i11], {instancePath:instancePath+"/styleUpdateProposals/" + i11,parentData:data93,parentDataProperty:i11,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate25.errors : vErrors.concat(validate25.errors);
errors = vErrors.length;
}
}
}
else {
const err190 = {instancePath:instancePath+"/styleUpdateProposals",schemaPath:"#/properties/styleUpdateProposals/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err190];
}
else {
vErrors.push(err190);
}
errors++;
}
}
}
else {
const err191 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err191];
}
else {
vErrors.push(err191);
}
errors++;
}
validate20.errors = vErrors;
return errors === 0;
}
validate20.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateStyle = validate27;
const schema39 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"ai-editor/style-version/1","title":"StyleVersion","type":"object","required":["schemaVersion","styleId","version","date","reason","cut","captions","precedents","styleGuide"],"additionalProperties":false,"properties":{"schemaVersion":{"const":1},"styleId":{"type":"string","minLength":1},"name":{"type":"string"},"version":{"type":"integer","minimum":1},"date":{"type":"string","format":"date-time"},"reason":{"type":"string","minLength":1},"basedOn":{"$ref":"#/$defs/styleRef"},"basedOnCorrections":{"type":"array","items":{"type":"string"}},"cut":{"type":"object","additionalProperties":false,"required":["silenceMaxUs","repeatsEnabled","repeatsSimilarity","minClipUs","protectSentenceEdgesUs","fillerWords","repeatedRejectionThreshold"],"properties":{"silenceMaxUs":{"$ref":"#/$defs/rule","description":"صمت أطول من هذا يُقترح حذفه"},"repeatsEnabled":{"$ref":"#/$defs/rule"},"repeatsSimilarity":{"$ref":"#/$defs/rule","description":"عتبة التشابه (0..1) لاعتبار جملتين إعادة"},"minClipUs":{"$ref":"#/$defs/rule","description":"الحد الأدنى لطول اللقطة الناتجة"},"protectSentenceEdgesUs":{"$ref":"#/$defs/rule","description":"هامش لا يُقص قبل/بعد الجملة"},"fillerWords":{"$ref":"#/$defs/rule","description":"قائمة كلمات الحشو (مثل: يعني، اه، امم)"},"repeatedRejectionThreshold":{"$ref":"#/$defs/rule","description":"عدد الاستثناءات بالسبب نفسه في مقترح واحد التي تطلق اقتراح تحديث النمط (FR-011)؛ القيمة عدد صحيح ≥ 2، الافتراضي 3"}}},"captions":{"type":"object","additionalProperties":false,"required":["enabled","fontFamily","fontSizePx","position","maxLines","wordsPerChunk","breakAtPauseUs","highlightCurrent","textColor","highlightColor","bgColor","safeAreaPct","flagLowConfidence"],"properties":{"enabled":{"$ref":"#/$defs/rule"},"fontFamily":{"$ref":"#/$defs/rule"},"fontSizePx":{"$ref":"#/$defs/rule"},"position":{"$ref":"#/$defs/rule","description":"bottom | center | top"},"maxLines":{"$ref":"#/$defs/rule"},"wordsPerChunk":{"$ref":"#/$defs/rule","description":"{min,max}"},"breakAtPauseUs":{"$ref":"#/$defs/rule"},"highlightCurrent":{"$ref":"#/$defs/rule"},"textColor":{"$ref":"#/$defs/rule"},"highlightColor":{"$ref":"#/$defs/rule"},"bgColor":{"$ref":"#/$defs/rule"},"safeAreaPct":{"$ref":"#/$defs/rule"},"flagLowConfidence":{"$ref":"#/$defs/rule","description":"عرض تعليم الكلمات منخفضة الثقة؛ العتبة نفسها في ملف تعريف المزود لا في النمط"}}},"precedents":{"type":"array","items":{"$ref":"#/$defs/precedent"}},"styleGuide":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"additionalProperties":false,"properties":{"styleId":{"type":"string"},"version":{"type":"integer","minimum":1}}},"source":{"type":"object","required":["kind","at"],"additionalProperties":false,"properties":{"kind":{"enum":["default","user","learned","imported"]},"ref":{"type":"string","description":"معرّف التصحيح/المقطع/الدورة الذي أنتج القيمة"},"at":{"type":"string","format":"date-time"}}},"rule":{"type":"object","required":["value","mode","source"],"additionalProperties":false,"properties":{"value":{},"mode":{"enum":["mandatory","preference"]},"source":{"$ref":"#/$defs/source"},"note":{"type":"string"}}},"precedent":{"type":"object","required":["id","ruleId","rule","quote","check","source","addedInVersion"],"additionalProperties":false,"properties":{"id":{"type":"string"},"ruleId":{"type":"string","description":"مسار الحقل مثل cut.silenceMaxUs"},"rule":{"type":"string","description":"القاعدة بجملة واحدة"},"quote":{"type":"string","description":"تصحيح المستخدم حرفياً"},"check":{"type":"string","description":"سؤال فحص ذاتي يطرحه الوكيل قبل الاقتراح"},"source":{"$ref":"#/$defs/source"},"addedInVersion":{"type":"integer"}}}}};
const schema40 = {"type":"object","required":["styleId","version"],"additionalProperties":false,"properties":{"styleId":{"type":"string"},"version":{"type":"integer","minimum":1}}};
const schema41 = {"type":"object","required":["value","mode","source"],"additionalProperties":false,"properties":{"value":{},"mode":{"enum":["mandatory","preference"]},"source":{"$ref":"#/$defs/source"},"note":{"type":"string"}}};
const schema42 = {"type":"object","required":["kind","at"],"additionalProperties":false,"properties":{"kind":{"enum":["default","user","learned","imported"]},"ref":{"type":"string","description":"معرّف التصحيح/المقطع/الدورة الذي أنتج القيمة"},"at":{"type":"string","format":"date-time"}}};

function validate28(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate28.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.value === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.mode === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "mode"},message:"must have required property '"+"mode"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.source === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "value") || (key0 === "mode")) || (key0 === "source")) || (key0 === "note"))){
const err3 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.mode !== undefined){
let data0 = data.mode;
if(!((data0 === "mandatory") || (data0 === "preference"))){
const err4 = {instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema41.properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.source !== undefined){
let data1 = data.source;
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.kind === undefined){
const err5 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data1.at === undefined){
const err6 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "at"},message:"must have required property '"+"at"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key1 in data1){
if(!(((key1 === "kind") || (key1 === "ref")) || (key1 === "at"))){
const err7 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data1.kind !== undefined){
let data2 = data1.kind;
if(!((((data2 === "default") || (data2 === "user")) || (data2 === "learned")) || (data2 === "imported"))){
const err8 = {instancePath:instancePath+"/source/kind",schemaPath:"#/$defs/source/properties/kind/enum",keyword:"enum",params:{allowedValues: schema42.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data1.ref !== undefined){
if(typeof data1.ref !== "string"){
const err9 = {instancePath:instancePath+"/source/ref",schemaPath:"#/$defs/source/properties/ref/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data1.at !== undefined){
let data4 = data1.at;
if(typeof data4 === "string"){
if(!(formats0.validate(data4))){
const err10 = {instancePath:instancePath+"/source/at",schemaPath:"#/$defs/source/properties/at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
else {
const err11 = {instancePath:instancePath+"/source/at",schemaPath:"#/$defs/source/properties/at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
}
else {
const err12 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.note !== undefined){
if(typeof data.note !== "string"){
const err13 = {instancePath:instancePath+"/note",schemaPath:"#/properties/note/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
}
else {
const err14 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
validate28.errors = vErrors;
return errors === 0;
}
validate28.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

const schema43 = {"type":"object","required":["id","ruleId","rule","quote","check","source","addedInVersion"],"additionalProperties":false,"properties":{"id":{"type":"string"},"ruleId":{"type":"string","description":"مسار الحقل مثل cut.silenceMaxUs"},"rule":{"type":"string","description":"القاعدة بجملة واحدة"},"quote":{"type":"string","description":"تصحيح المستخدم حرفياً"},"check":{"type":"string","description":"سؤال فحص ذاتي يطرحه الوكيل قبل الاقتراح"},"source":{"$ref":"#/$defs/source"},"addedInVersion":{"type":"integer"}}};

function validate49(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate49.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.id === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.ruleId === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "ruleId"},message:"must have required property '"+"ruleId"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.rule === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "rule"},message:"must have required property '"+"rule"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.quote === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "quote"},message:"must have required property '"+"quote"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.check === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "check"},message:"must have required property '"+"check"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.source === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "source"},message:"must have required property '"+"source"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.addedInVersion === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "addedInVersion"},message:"must have required property '"+"addedInVersion"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
for(const key0 in data){
if(!(((((((key0 === "id") || (key0 === "ruleId")) || (key0 === "rule")) || (key0 === "quote")) || (key0 === "check")) || (key0 === "source")) || (key0 === "addedInVersion"))){
const err7 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
if(data.id !== undefined){
if(typeof data.id !== "string"){
const err8 = {instancePath:instancePath+"/id",schemaPath:"#/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
}
if(data.ruleId !== undefined){
if(typeof data.ruleId !== "string"){
const err9 = {instancePath:instancePath+"/ruleId",schemaPath:"#/properties/ruleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.rule !== undefined){
if(typeof data.rule !== "string"){
const err10 = {instancePath:instancePath+"/rule",schemaPath:"#/properties/rule/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.quote !== undefined){
if(typeof data.quote !== "string"){
const err11 = {instancePath:instancePath+"/quote",schemaPath:"#/properties/quote/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.check !== undefined){
if(typeof data.check !== "string"){
const err12 = {instancePath:instancePath+"/check",schemaPath:"#/properties/check/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.source !== undefined){
let data5 = data.source;
if(data5 && typeof data5 == "object" && !Array.isArray(data5)){
if(data5.kind === undefined){
const err13 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "kind"},message:"must have required property '"+"kind"+"'"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
if(data5.at === undefined){
const err14 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/required",keyword:"required",params:{missingProperty: "at"},message:"must have required property '"+"at"+"'"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
for(const key1 in data5){
if(!(((key1 === "kind") || (key1 === "ref")) || (key1 === "at"))){
const err15 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data5.kind !== undefined){
let data6 = data5.kind;
if(!((((data6 === "default") || (data6 === "user")) || (data6 === "learned")) || (data6 === "imported"))){
const err16 = {instancePath:instancePath+"/source/kind",schemaPath:"#/$defs/source/properties/kind/enum",keyword:"enum",params:{allowedValues: schema42.properties.kind.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
if(data5.ref !== undefined){
if(typeof data5.ref !== "string"){
const err17 = {instancePath:instancePath+"/source/ref",schemaPath:"#/$defs/source/properties/ref/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data5.at !== undefined){
let data8 = data5.at;
if(typeof data8 === "string"){
if(!(formats0.validate(data8))){
const err18 = {instancePath:instancePath+"/source/at",schemaPath:"#/$defs/source/properties/at/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
else {
const err19 = {instancePath:instancePath+"/source/at",schemaPath:"#/$defs/source/properties/at/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
}
else {
const err20 = {instancePath:instancePath+"/source",schemaPath:"#/$defs/source/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
}
if(data.addedInVersion !== undefined){
let data9 = data.addedInVersion;
if(!((typeof data9 == "number") && (!(data9 % 1) && !isNaN(data9)))){
const err21 = {instancePath:instancePath+"/addedInVersion",schemaPath:"#/properties/addedInVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
}
}
else {
const err22 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
validate49.errors = vErrors;
return errors === 0;
}
validate49.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};


function validate27(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="ai-editor/style-version/1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate27.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.styleId === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.version === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.date === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "date"},message:"must have required property '"+"date"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.reason === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "reason"},message:"must have required property '"+"reason"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.cut === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "cut"},message:"must have required property '"+"cut"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.captions === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "captions"},message:"must have required property '"+"captions"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.precedents === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "precedents"},message:"must have required property '"+"precedents"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.styleGuide === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleGuide"},message:"must have required property '"+"styleGuide"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema39.properties, key0))){
const err9 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(1 !== data.schemaVersion){
const err10 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.styleId !== undefined){
let data1 = data.styleId;
if(typeof data1 === "string"){
if(func4(data1) < 1){
const err11 = {instancePath:instancePath+"/styleId",schemaPath:"#/properties/styleId/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
else {
const err12 = {instancePath:instancePath+"/styleId",schemaPath:"#/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.name !== undefined){
if(typeof data.name !== "string"){
const err13 = {instancePath:instancePath+"/name",schemaPath:"#/properties/name/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.version !== undefined){
let data3 = data.version;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err14 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
if(typeof data3 == "number"){
if(data3 < 1 || isNaN(data3)){
const err15 = {instancePath:instancePath+"/version",schemaPath:"#/properties/version/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
}
if(data.date !== undefined){
let data4 = data.date;
if(typeof data4 === "string"){
if(!(formats0.validate(data4))){
const err16 = {instancePath:instancePath+"/date",schemaPath:"#/properties/date/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
}
else {
const err17 = {instancePath:instancePath+"/date",schemaPath:"#/properties/date/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
if(data.reason !== undefined){
let data5 = data.reason;
if(typeof data5 === "string"){
if(func4(data5) < 1){
const err18 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
else {
const err19 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.basedOn !== undefined){
let data6 = data.basedOn;
if(data6 && typeof data6 == "object" && !Array.isArray(data6)){
if(data6.styleId === undefined){
const err20 = {instancePath:instancePath+"/basedOn",schemaPath:"#/$defs/styleRef/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data6.version === undefined){
const err21 = {instancePath:instancePath+"/basedOn",schemaPath:"#/$defs/styleRef/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
for(const key1 in data6){
if(!((key1 === "styleId") || (key1 === "version"))){
const err22 = {instancePath:instancePath+"/basedOn",schemaPath:"#/$defs/styleRef/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
}
if(data6.styleId !== undefined){
if(typeof data6.styleId !== "string"){
const err23 = {instancePath:instancePath+"/basedOn/styleId",schemaPath:"#/$defs/styleRef/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
}
if(data6.version !== undefined){
let data8 = data6.version;
if(!((typeof data8 == "number") && (!(data8 % 1) && !isNaN(data8)))){
const err24 = {instancePath:instancePath+"/basedOn/version",schemaPath:"#/$defs/styleRef/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
if(typeof data8 == "number"){
if(data8 < 1 || isNaN(data8)){
const err25 = {instancePath:instancePath+"/basedOn/version",schemaPath:"#/$defs/styleRef/properties/version/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
}
}
else {
const err26 = {instancePath:instancePath+"/basedOn",schemaPath:"#/$defs/styleRef/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data.basedOnCorrections !== undefined){
let data9 = data.basedOnCorrections;
if(Array.isArray(data9)){
const len0 = data9.length;
for(let i0=0; i0<len0; i0++){
if(typeof data9[i0] !== "string"){
const err27 = {instancePath:instancePath+"/basedOnCorrections/" + i0,schemaPath:"#/properties/basedOnCorrections/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
}
else {
const err28 = {instancePath:instancePath+"/basedOnCorrections",schemaPath:"#/properties/basedOnCorrections/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data.cut !== undefined){
let data11 = data.cut;
if(data11 && typeof data11 == "object" && !Array.isArray(data11)){
if(data11.silenceMaxUs === undefined){
const err29 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "silenceMaxUs"},message:"must have required property '"+"silenceMaxUs"+"'"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(data11.repeatsEnabled === undefined){
const err30 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "repeatsEnabled"},message:"must have required property '"+"repeatsEnabled"+"'"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
if(data11.repeatsSimilarity === undefined){
const err31 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "repeatsSimilarity"},message:"must have required property '"+"repeatsSimilarity"+"'"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(data11.minClipUs === undefined){
const err32 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "minClipUs"},message:"must have required property '"+"minClipUs"+"'"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
if(data11.protectSentenceEdgesUs === undefined){
const err33 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "protectSentenceEdgesUs"},message:"must have required property '"+"protectSentenceEdgesUs"+"'"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data11.fillerWords === undefined){
const err34 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "fillerWords"},message:"must have required property '"+"fillerWords"+"'"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
if(data11.repeatedRejectionThreshold === undefined){
const err35 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/required",keyword:"required",params:{missingProperty: "repeatedRejectionThreshold"},message:"must have required property '"+"repeatedRejectionThreshold"+"'"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
for(const key2 in data11){
if(!(((((((key2 === "silenceMaxUs") || (key2 === "repeatsEnabled")) || (key2 === "repeatsSimilarity")) || (key2 === "minClipUs")) || (key2 === "protectSentenceEdgesUs")) || (key2 === "fillerWords")) || (key2 === "repeatedRejectionThreshold"))){
const err36 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
}
if(data11.silenceMaxUs !== undefined){
if(!(validate28(data11.silenceMaxUs, {instancePath:instancePath+"/cut/silenceMaxUs",parentData:data11,parentDataProperty:"silenceMaxUs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.repeatsEnabled !== undefined){
if(!(validate28(data11.repeatsEnabled, {instancePath:instancePath+"/cut/repeatsEnabled",parentData:data11,parentDataProperty:"repeatsEnabled",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.repeatsSimilarity !== undefined){
if(!(validate28(data11.repeatsSimilarity, {instancePath:instancePath+"/cut/repeatsSimilarity",parentData:data11,parentDataProperty:"repeatsSimilarity",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.minClipUs !== undefined){
if(!(validate28(data11.minClipUs, {instancePath:instancePath+"/cut/minClipUs",parentData:data11,parentDataProperty:"minClipUs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.protectSentenceEdgesUs !== undefined){
if(!(validate28(data11.protectSentenceEdgesUs, {instancePath:instancePath+"/cut/protectSentenceEdgesUs",parentData:data11,parentDataProperty:"protectSentenceEdgesUs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.fillerWords !== undefined){
if(!(validate28(data11.fillerWords, {instancePath:instancePath+"/cut/fillerWords",parentData:data11,parentDataProperty:"fillerWords",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data11.repeatedRejectionThreshold !== undefined){
if(!(validate28(data11.repeatedRejectionThreshold, {instancePath:instancePath+"/cut/repeatedRejectionThreshold",parentData:data11,parentDataProperty:"repeatedRejectionThreshold",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
}
else {
const err37 = {instancePath:instancePath+"/cut",schemaPath:"#/properties/cut/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
}
if(data.captions !== undefined){
let data19 = data.captions;
if(data19 && typeof data19 == "object" && !Array.isArray(data19)){
if(data19.enabled === undefined){
const err38 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "enabled"},message:"must have required property '"+"enabled"+"'"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
if(data19.fontFamily === undefined){
const err39 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "fontFamily"},message:"must have required property '"+"fontFamily"+"'"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
if(data19.fontSizePx === undefined){
const err40 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "fontSizePx"},message:"must have required property '"+"fontSizePx"+"'"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
if(data19.position === undefined){
const err41 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "position"},message:"must have required property '"+"position"+"'"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
if(data19.maxLines === undefined){
const err42 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "maxLines"},message:"must have required property '"+"maxLines"+"'"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
if(data19.wordsPerChunk === undefined){
const err43 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "wordsPerChunk"},message:"must have required property '"+"wordsPerChunk"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data19.breakAtPauseUs === undefined){
const err44 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "breakAtPauseUs"},message:"must have required property '"+"breakAtPauseUs"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data19.highlightCurrent === undefined){
const err45 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "highlightCurrent"},message:"must have required property '"+"highlightCurrent"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
if(data19.textColor === undefined){
const err46 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "textColor"},message:"must have required property '"+"textColor"+"'"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
if(data19.highlightColor === undefined){
const err47 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "highlightColor"},message:"must have required property '"+"highlightColor"+"'"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
if(data19.bgColor === undefined){
const err48 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "bgColor"},message:"must have required property '"+"bgColor"+"'"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
if(data19.safeAreaPct === undefined){
const err49 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "safeAreaPct"},message:"must have required property '"+"safeAreaPct"+"'"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
if(data19.flagLowConfidence === undefined){
const err50 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/required",keyword:"required",params:{missingProperty: "flagLowConfidence"},message:"must have required property '"+"flagLowConfidence"+"'"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
for(const key3 in data19){
if(!(func1.call(schema39.properties.captions.properties, key3))){
const err51 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key3},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
if(data19.enabled !== undefined){
if(!(validate28(data19.enabled, {instancePath:instancePath+"/captions/enabled",parentData:data19,parentDataProperty:"enabled",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.fontFamily !== undefined){
if(!(validate28(data19.fontFamily, {instancePath:instancePath+"/captions/fontFamily",parentData:data19,parentDataProperty:"fontFamily",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.fontSizePx !== undefined){
if(!(validate28(data19.fontSizePx, {instancePath:instancePath+"/captions/fontSizePx",parentData:data19,parentDataProperty:"fontSizePx",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.position !== undefined){
if(!(validate28(data19.position, {instancePath:instancePath+"/captions/position",parentData:data19,parentDataProperty:"position",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.maxLines !== undefined){
if(!(validate28(data19.maxLines, {instancePath:instancePath+"/captions/maxLines",parentData:data19,parentDataProperty:"maxLines",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.wordsPerChunk !== undefined){
if(!(validate28(data19.wordsPerChunk, {instancePath:instancePath+"/captions/wordsPerChunk",parentData:data19,parentDataProperty:"wordsPerChunk",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.breakAtPauseUs !== undefined){
if(!(validate28(data19.breakAtPauseUs, {instancePath:instancePath+"/captions/breakAtPauseUs",parentData:data19,parentDataProperty:"breakAtPauseUs",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.highlightCurrent !== undefined){
if(!(validate28(data19.highlightCurrent, {instancePath:instancePath+"/captions/highlightCurrent",parentData:data19,parentDataProperty:"highlightCurrent",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.textColor !== undefined){
if(!(validate28(data19.textColor, {instancePath:instancePath+"/captions/textColor",parentData:data19,parentDataProperty:"textColor",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.highlightColor !== undefined){
if(!(validate28(data19.highlightColor, {instancePath:instancePath+"/captions/highlightColor",parentData:data19,parentDataProperty:"highlightColor",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.bgColor !== undefined){
if(!(validate28(data19.bgColor, {instancePath:instancePath+"/captions/bgColor",parentData:data19,parentDataProperty:"bgColor",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.safeAreaPct !== undefined){
if(!(validate28(data19.safeAreaPct, {instancePath:instancePath+"/captions/safeAreaPct",parentData:data19,parentDataProperty:"safeAreaPct",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
if(data19.flagLowConfidence !== undefined){
if(!(validate28(data19.flagLowConfidence, {instancePath:instancePath+"/captions/flagLowConfidence",parentData:data19,parentDataProperty:"flagLowConfidence",rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate28.errors : vErrors.concat(validate28.errors);
errors = vErrors.length;
}
}
}
else {
const err52 = {instancePath:instancePath+"/captions",schemaPath:"#/properties/captions/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
if(data.precedents !== undefined){
let data33 = data.precedents;
if(Array.isArray(data33)){
const len1 = data33.length;
for(let i1=0; i1<len1; i1++){
if(!(validate49(data33[i1], {instancePath:instancePath+"/precedents/" + i1,parentData:data33,parentDataProperty:i1,rootData,dynamicAnchors}))){
vErrors = vErrors === null ? validate49.errors : vErrors.concat(validate49.errors);
errors = vErrors.length;
}
}
}
else {
const err53 = {instancePath:instancePath+"/precedents",schemaPath:"#/properties/precedents/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.styleGuide !== undefined){
if(typeof data.styleGuide !== "string"){
const err54 = {instancePath:instancePath+"/styleGuide",schemaPath:"#/properties/styleGuide/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
else {
const err55 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
validate27.errors = vErrors;
return errors === 0;
}
validate27.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const validateTranscript = validate51;
const schema45 = {"$schema":"https://json-schema.org/draft/2020-12/schema","$id":"ai-editor/transcript/1","title":"Transcript (عقد موحد لكل مزودي التفريغ، سحابي أو محلي)","type":"object","required":["schemaVersion","provider","model","modelParams","language","durationUs","audioSha256","words","createdAt"],"additionalProperties":false,"properties":{"schemaVersion":{"const":1},"provider":{"type":"string","description":"openai | groq | deepgram | elevenlabs | local-whisper ..."},"model":{"type":"string"},"modelParams":{"type":"object","description":"language, mip_opt_out, ... كما أُرسلت"},"audioSha256":{"type":"string","description":"بصمة ملف الصوت المرسَل"},"language":{"type":"string","description":"BCP-47، مثل ar"},"durationUs":{"type":"integer","minimum":0},"createdAt":{"type":"string","format":"date-time"},"words":{"type":"array","items":{"type":"object","required":["id","text","startUs","endUs","confidence"],"additionalProperties":false,"properties":{"id":{"type":"string"},"text":{"type":"string","minLength":1},"startUs":{"type":"integer","minimum":0},"endUs":{"type":"integer","minimum":0},"confidence":{"oneOf":[{"type":"number","minimum":0,"maximum":1},{"type":"null"}],"description":"مُطبَّعة 0..1 (ElevenLabs: exp(logprob))؛ null إن المزود لا يعطي ثقة لكل كلمة. علامة «منخفض الثقة» تُحسب عند العرض: confidence < threshold المزود"},"lang":{"type":"string"},"original":{"type":"string","description":"النص قبل أي تصحيح"},"correctedBy":{"enum":["user","auto"],"description":"auto محجوزة للتصحيح التلقائي في ميزة لاحقة (القرار 21)؛ لا تُكتب في 001"}}}},"segments":{"type":"array","items":{"type":"object","required":["startUs","endUs","wordIds"],"additionalProperties":false,"properties":{"startUs":{"type":"integer"},"endUs":{"type":"integer"},"wordIds":{"type":"array","items":{"type":"string"}},"text":{"type":"string"}}}},"rawRef":{"type":"string","description":"مسار استجابة المزود الخام داخل مجلد المشروع للمراجعة"}}};

function validate51(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
/*# sourceURL="ai-editor/transcript/1" */;
let vErrors = null;
let errors = 0;
const evaluated0 = validate51.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.schemaVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "schemaVersion"},message:"must have required property '"+"schemaVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.provider === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "provider"},message:"must have required property '"+"provider"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
if(data.model === undefined){
const err2 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "model"},message:"must have required property '"+"model"+"'"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(data.modelParams === undefined){
const err3 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "modelParams"},message:"must have required property '"+"modelParams"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data.language === undefined){
const err4 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "language"},message:"must have required property '"+"language"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data.durationUs === undefined){
const err5 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "durationUs"},message:"must have required property '"+"durationUs"+"'"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
if(data.audioSha256 === undefined){
const err6 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "audioSha256"},message:"must have required property '"+"audioSha256"+"'"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
if(data.words === undefined){
const err7 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "words"},message:"must have required property '"+"words"+"'"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
if(data.createdAt === undefined){
const err8 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "createdAt"},message:"must have required property '"+"createdAt"+"'"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
for(const key0 in data){
if(!(func1.call(schema45.properties, key0))){
const err9 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err9];
}
else {
vErrors.push(err9);
}
errors++;
}
}
if(data.schemaVersion !== undefined){
if(1 !== data.schemaVersion){
const err10 = {instancePath:instancePath+"/schemaVersion",schemaPath:"#/properties/schemaVersion/const",keyword:"const",params:{allowedValue: 1},message:"must be equal to constant"};
if(vErrors === null){
vErrors = [err10];
}
else {
vErrors.push(err10);
}
errors++;
}
}
if(data.provider !== undefined){
if(typeof data.provider !== "string"){
const err11 = {instancePath:instancePath+"/provider",schemaPath:"#/properties/provider/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err11];
}
else {
vErrors.push(err11);
}
errors++;
}
}
if(data.model !== undefined){
if(typeof data.model !== "string"){
const err12 = {instancePath:instancePath+"/model",schemaPath:"#/properties/model/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err12];
}
else {
vErrors.push(err12);
}
errors++;
}
}
if(data.modelParams !== undefined){
let data3 = data.modelParams;
if(!(data3 && typeof data3 == "object" && !Array.isArray(data3))){
const err13 = {instancePath:instancePath+"/modelParams",schemaPath:"#/properties/modelParams/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err13];
}
else {
vErrors.push(err13);
}
errors++;
}
}
if(data.audioSha256 !== undefined){
if(typeof data.audioSha256 !== "string"){
const err14 = {instancePath:instancePath+"/audioSha256",schemaPath:"#/properties/audioSha256/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err14];
}
else {
vErrors.push(err14);
}
errors++;
}
}
if(data.language !== undefined){
if(typeof data.language !== "string"){
const err15 = {instancePath:instancePath+"/language",schemaPath:"#/properties/language/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err15];
}
else {
vErrors.push(err15);
}
errors++;
}
}
if(data.durationUs !== undefined){
let data6 = data.durationUs;
if(!((typeof data6 == "number") && (!(data6 % 1) && !isNaN(data6)))){
const err16 = {instancePath:instancePath+"/durationUs",schemaPath:"#/properties/durationUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err16];
}
else {
vErrors.push(err16);
}
errors++;
}
if(typeof data6 == "number"){
if(data6 < 0 || isNaN(data6)){
const err17 = {instancePath:instancePath+"/durationUs",schemaPath:"#/properties/durationUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err17];
}
else {
vErrors.push(err17);
}
errors++;
}
}
}
if(data.createdAt !== undefined){
let data7 = data.createdAt;
if(typeof data7 === "string"){
if(!(formats0.validate(data7))){
const err18 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/format",keyword:"format",params:{format: "date-time"},message:"must match format \""+"date-time"+"\""};
if(vErrors === null){
vErrors = [err18];
}
else {
vErrors.push(err18);
}
errors++;
}
}
else {
const err19 = {instancePath:instancePath+"/createdAt",schemaPath:"#/properties/createdAt/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err19];
}
else {
vErrors.push(err19);
}
errors++;
}
}
if(data.words !== undefined){
let data8 = data.words;
if(Array.isArray(data8)){
const len0 = data8.length;
for(let i0=0; i0<len0; i0++){
let data9 = data8[i0];
if(data9 && typeof data9 == "object" && !Array.isArray(data9)){
if(data9.id === undefined){
const err20 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/required",keyword:"required",params:{missingProperty: "id"},message:"must have required property '"+"id"+"'"};
if(vErrors === null){
vErrors = [err20];
}
else {
vErrors.push(err20);
}
errors++;
}
if(data9.text === undefined){
const err21 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err21];
}
else {
vErrors.push(err21);
}
errors++;
}
if(data9.startUs === undefined){
const err22 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/required",keyword:"required",params:{missingProperty: "startUs"},message:"must have required property '"+"startUs"+"'"};
if(vErrors === null){
vErrors = [err22];
}
else {
vErrors.push(err22);
}
errors++;
}
if(data9.endUs === undefined){
const err23 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/required",keyword:"required",params:{missingProperty: "endUs"},message:"must have required property '"+"endUs"+"'"};
if(vErrors === null){
vErrors = [err23];
}
else {
vErrors.push(err23);
}
errors++;
}
if(data9.confidence === undefined){
const err24 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/required",keyword:"required",params:{missingProperty: "confidence"},message:"must have required property '"+"confidence"+"'"};
if(vErrors === null){
vErrors = [err24];
}
else {
vErrors.push(err24);
}
errors++;
}
for(const key1 in data9){
if(!((((((((key1 === "id") || (key1 === "text")) || (key1 === "startUs")) || (key1 === "endUs")) || (key1 === "confidence")) || (key1 === "lang")) || (key1 === "original")) || (key1 === "correctedBy"))){
const err25 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key1},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err25];
}
else {
vErrors.push(err25);
}
errors++;
}
}
if(data9.id !== undefined){
if(typeof data9.id !== "string"){
const err26 = {instancePath:instancePath+"/words/" + i0+"/id",schemaPath:"#/properties/words/items/properties/id/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err26];
}
else {
vErrors.push(err26);
}
errors++;
}
}
if(data9.text !== undefined){
let data11 = data9.text;
if(typeof data11 === "string"){
if(func4(data11) < 1){
const err27 = {instancePath:instancePath+"/words/" + i0+"/text",schemaPath:"#/properties/words/items/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err27];
}
else {
vErrors.push(err27);
}
errors++;
}
}
else {
const err28 = {instancePath:instancePath+"/words/" + i0+"/text",schemaPath:"#/properties/words/items/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err28];
}
else {
vErrors.push(err28);
}
errors++;
}
}
if(data9.startUs !== undefined){
let data12 = data9.startUs;
if(!((typeof data12 == "number") && (!(data12 % 1) && !isNaN(data12)))){
const err29 = {instancePath:instancePath+"/words/" + i0+"/startUs",schemaPath:"#/properties/words/items/properties/startUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err29];
}
else {
vErrors.push(err29);
}
errors++;
}
if(typeof data12 == "number"){
if(data12 < 0 || isNaN(data12)){
const err30 = {instancePath:instancePath+"/words/" + i0+"/startUs",schemaPath:"#/properties/words/items/properties/startUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err30];
}
else {
vErrors.push(err30);
}
errors++;
}
}
}
if(data9.endUs !== undefined){
let data13 = data9.endUs;
if(!((typeof data13 == "number") && (!(data13 % 1) && !isNaN(data13)))){
const err31 = {instancePath:instancePath+"/words/" + i0+"/endUs",schemaPath:"#/properties/words/items/properties/endUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err31];
}
else {
vErrors.push(err31);
}
errors++;
}
if(typeof data13 == "number"){
if(data13 < 0 || isNaN(data13)){
const err32 = {instancePath:instancePath+"/words/" + i0+"/endUs",schemaPath:"#/properties/words/items/properties/endUs/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err32];
}
else {
vErrors.push(err32);
}
errors++;
}
}
}
if(data9.confidence !== undefined){
let data14 = data9.confidence;
const _errs31 = errors;
let valid4 = false;
let passing0 = null;
const _errs32 = errors;
if(typeof data14 == "number"){
if(data14 > 1 || isNaN(data14)){
const err33 = {instancePath:instancePath+"/words/" + i0+"/confidence",schemaPath:"#/properties/words/items/properties/confidence/oneOf/0/maximum",keyword:"maximum",params:{comparison: "<=", limit: 1},message:"must be <= 1"};
if(vErrors === null){
vErrors = [err33];
}
else {
vErrors.push(err33);
}
errors++;
}
if(data14 < 0 || isNaN(data14)){
const err34 = {instancePath:instancePath+"/words/" + i0+"/confidence",schemaPath:"#/properties/words/items/properties/confidence/oneOf/0/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err34];
}
else {
vErrors.push(err34);
}
errors++;
}
}
else {
const err35 = {instancePath:instancePath+"/words/" + i0+"/confidence",schemaPath:"#/properties/words/items/properties/confidence/oneOf/0/type",keyword:"type",params:{type: "number"},message:"must be number"};
if(vErrors === null){
vErrors = [err35];
}
else {
vErrors.push(err35);
}
errors++;
}
var _valid0 = _errs32 === errors;
if(_valid0){
valid4 = true;
passing0 = 0;
}
const _errs34 = errors;
if(data14 !== null){
const err36 = {instancePath:instancePath+"/words/" + i0+"/confidence",schemaPath:"#/properties/words/items/properties/confidence/oneOf/1/type",keyword:"type",params:{type: "null"},message:"must be null"};
if(vErrors === null){
vErrors = [err36];
}
else {
vErrors.push(err36);
}
errors++;
}
var _valid0 = _errs34 === errors;
if(_valid0 && valid4){
valid4 = false;
passing0 = [passing0, 1];
}
else {
if(_valid0){
valid4 = true;
passing0 = 1;
}
}
if(!valid4){
const err37 = {instancePath:instancePath+"/words/" + i0+"/confidence",schemaPath:"#/properties/words/items/properties/confidence/oneOf",keyword:"oneOf",params:{passingSchemas: passing0},message:"must match exactly one schema in oneOf"};
if(vErrors === null){
vErrors = [err37];
}
else {
vErrors.push(err37);
}
errors++;
}
else {
errors = _errs31;
if(vErrors !== null){
if(_errs31){
vErrors.length = _errs31;
}
else {
vErrors = null;
}
}
}
}
if(data9.lang !== undefined){
if(typeof data9.lang !== "string"){
const err38 = {instancePath:instancePath+"/words/" + i0+"/lang",schemaPath:"#/properties/words/items/properties/lang/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err38];
}
else {
vErrors.push(err38);
}
errors++;
}
}
if(data9.original !== undefined){
if(typeof data9.original !== "string"){
const err39 = {instancePath:instancePath+"/words/" + i0+"/original",schemaPath:"#/properties/words/items/properties/original/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err39];
}
else {
vErrors.push(err39);
}
errors++;
}
}
if(data9.correctedBy !== undefined){
let data17 = data9.correctedBy;
if(!((data17 === "user") || (data17 === "auto"))){
const err40 = {instancePath:instancePath+"/words/" + i0+"/correctedBy",schemaPath:"#/properties/words/items/properties/correctedBy/enum",keyword:"enum",params:{allowedValues: schema45.properties.words.items.properties.correctedBy.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err40];
}
else {
vErrors.push(err40);
}
errors++;
}
}
}
else {
const err41 = {instancePath:instancePath+"/words/" + i0,schemaPath:"#/properties/words/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err41];
}
else {
vErrors.push(err41);
}
errors++;
}
}
}
else {
const err42 = {instancePath:instancePath+"/words",schemaPath:"#/properties/words/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err42];
}
else {
vErrors.push(err42);
}
errors++;
}
}
if(data.segments !== undefined){
let data18 = data.segments;
if(Array.isArray(data18)){
const len1 = data18.length;
for(let i1=0; i1<len1; i1++){
let data19 = data18[i1];
if(data19 && typeof data19 == "object" && !Array.isArray(data19)){
if(data19.startUs === undefined){
const err43 = {instancePath:instancePath+"/segments/" + i1,schemaPath:"#/properties/segments/items/required",keyword:"required",params:{missingProperty: "startUs"},message:"must have required property '"+"startUs"+"'"};
if(vErrors === null){
vErrors = [err43];
}
else {
vErrors.push(err43);
}
errors++;
}
if(data19.endUs === undefined){
const err44 = {instancePath:instancePath+"/segments/" + i1,schemaPath:"#/properties/segments/items/required",keyword:"required",params:{missingProperty: "endUs"},message:"must have required property '"+"endUs"+"'"};
if(vErrors === null){
vErrors = [err44];
}
else {
vErrors.push(err44);
}
errors++;
}
if(data19.wordIds === undefined){
const err45 = {instancePath:instancePath+"/segments/" + i1,schemaPath:"#/properties/segments/items/required",keyword:"required",params:{missingProperty: "wordIds"},message:"must have required property '"+"wordIds"+"'"};
if(vErrors === null){
vErrors = [err45];
}
else {
vErrors.push(err45);
}
errors++;
}
for(const key2 in data19){
if(!((((key2 === "startUs") || (key2 === "endUs")) || (key2 === "wordIds")) || (key2 === "text"))){
const err46 = {instancePath:instancePath+"/segments/" + i1,schemaPath:"#/properties/segments/items/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key2},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err46];
}
else {
vErrors.push(err46);
}
errors++;
}
}
if(data19.startUs !== undefined){
let data20 = data19.startUs;
if(!((typeof data20 == "number") && (!(data20 % 1) && !isNaN(data20)))){
const err47 = {instancePath:instancePath+"/segments/" + i1+"/startUs",schemaPath:"#/properties/segments/items/properties/startUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err47];
}
else {
vErrors.push(err47);
}
errors++;
}
}
if(data19.endUs !== undefined){
let data21 = data19.endUs;
if(!((typeof data21 == "number") && (!(data21 % 1) && !isNaN(data21)))){
const err48 = {instancePath:instancePath+"/segments/" + i1+"/endUs",schemaPath:"#/properties/segments/items/properties/endUs/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err48];
}
else {
vErrors.push(err48);
}
errors++;
}
}
if(data19.wordIds !== undefined){
let data22 = data19.wordIds;
if(Array.isArray(data22)){
const len2 = data22.length;
for(let i2=0; i2<len2; i2++){
if(typeof data22[i2] !== "string"){
const err49 = {instancePath:instancePath+"/segments/" + i1+"/wordIds/" + i2,schemaPath:"#/properties/segments/items/properties/wordIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err49];
}
else {
vErrors.push(err49);
}
errors++;
}
}
}
else {
const err50 = {instancePath:instancePath+"/segments/" + i1+"/wordIds",schemaPath:"#/properties/segments/items/properties/wordIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err50];
}
else {
vErrors.push(err50);
}
errors++;
}
}
if(data19.text !== undefined){
if(typeof data19.text !== "string"){
const err51 = {instancePath:instancePath+"/segments/" + i1+"/text",schemaPath:"#/properties/segments/items/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err51];
}
else {
vErrors.push(err51);
}
errors++;
}
}
}
else {
const err52 = {instancePath:instancePath+"/segments/" + i1,schemaPath:"#/properties/segments/items/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err52];
}
else {
vErrors.push(err52);
}
errors++;
}
}
}
else {
const err53 = {instancePath:instancePath+"/segments",schemaPath:"#/properties/segments/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err53];
}
else {
vErrors.push(err53);
}
errors++;
}
}
if(data.rawRef !== undefined){
if(typeof data.rawRef !== "string"){
const err54 = {instancePath:instancePath+"/rawRef",schemaPath:"#/properties/rawRef/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err54];
}
else {
vErrors.push(err54);
}
errors++;
}
}
}
else {
const err55 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err55];
}
else {
vErrors.push(err55);
}
errors++;
}
validate51.errors = vErrors;
return errors === 0;
}
validate51.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_project_import = validate52;
const schema46 = {"type":"object","required":["path"],"additionalProperties":false,"properties":{"path":{"type":"string"},"styleRef":{"$ref":"#/$defs/styleRef"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};
const schema47 = {"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}};

function validate52(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate52.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.path === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "path") || (key0 === "styleRef"))){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.path !== undefined){
if(typeof data.path !== "string"){
const err2 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.styleRef !== undefined){
let data1 = data.styleRef;
if(data1 && typeof data1 == "object" && !Array.isArray(data1)){
if(data1.styleId === undefined){
const err3 = {instancePath:instancePath+"/styleRef",schemaPath:"#/$defs/styleRef/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
if(data1.version === undefined){
const err4 = {instancePath:instancePath+"/styleRef",schemaPath:"#/$defs/styleRef/required",keyword:"required",params:{missingProperty: "version"},message:"must have required property '"+"version"+"'"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(data1.styleId !== undefined){
if(typeof data1.styleId !== "string"){
const err5 = {instancePath:instancePath+"/styleRef/styleId",schemaPath:"#/$defs/styleRef/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data1.version !== undefined){
let data3 = data1.version;
if(!((typeof data3 == "number") && (!(data3 % 1) && !isNaN(data3)))){
const err6 = {instancePath:instancePath+"/styleRef/version",schemaPath:"#/$defs/styleRef/properties/version/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath:instancePath+"/styleRef",schemaPath:"#/$defs/styleRef/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
}
}
else {
const err8 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err8];
}
else {
vErrors.push(err8);
}
errors++;
}
validate52.errors = vErrors;
return errors === 0;
}
validate52.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_transcript_request = validate53;
const schema48 = {"type":"object","additionalProperties":false,"properties":{"mode":{"enum":["cloud","local"]}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate53(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate53.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
if(!(key0 === "mode")){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
if(data.mode !== undefined){
let data0 = data.mode;
if(!((data0 === "cloud") || (data0 === "local"))){
const err1 = {instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema48.properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
}
else {
const err2 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
validate53.errors = vErrors;
return errors === 0;
}
validate53.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_proposal_request = validate54;
const schema49 = {"type":"object","additionalProperties":false,"properties":{},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate54(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate54.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
validate54.errors = vErrors;
return errors === 0;
}
validate54.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_proposal_exclude = validate55;
const schema50 = {"type":"object","required":["proposalId","itemIds"],"additionalProperties":false,"properties":{"proposalId":{"type":"string"},"itemIds":{"type":"array","items":{"type":"string"},"minItems":1}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate55(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate55.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.proposalId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposalId"},message:"must have required property '"+"proposalId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.itemIds === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "itemIds"},message:"must have required property '"+"itemIds"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "proposalId") || (key0 === "itemIds"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err3 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.itemIds !== undefined){
let data1 = data.itemIds;
if(Array.isArray(data1)){
if(data1.length < 1){
const err4 = {instancePath:instancePath+"/itemIds",schemaPath:"#/properties/itemIds/minItems",keyword:"minItems",params:{limit: 1},message:"must NOT have fewer than 1 items"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
const len0 = data1.length;
for(let i0=0; i0<len0; i0++){
if(typeof data1[i0] !== "string"){
const err5 = {instancePath:instancePath+"/itemIds/" + i0,schemaPath:"#/properties/itemIds/items/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
}
else {
const err6 = {instancePath:instancePath+"/itemIds",schemaPath:"#/properties/itemIds/type",keyword:"type",params:{type: "array"},message:"must be array"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate55.errors = vErrors;
return errors === 0;
}
validate55.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_proposal_apply = validate56;
const schema51 = {"type":"object","required":["proposalId"],"additionalProperties":false,"properties":{"proposalId":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate56(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate56.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.proposalId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposalId"},message:"must have required property '"+"proposalId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "proposalId")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err2 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate56.errors = vErrors;
return errors === 0;
}
validate56.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_proposal_discard = validate57;
const schema52 = {"type":"object","required":["proposalId"],"additionalProperties":false,"properties":{"proposalId":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate57(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate57.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.proposalId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposalId"},message:"must have required property '"+"proposalId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "proposalId")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err2 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate57.errors = vErrors;
return errors === 0;
}
validate57.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_clip_split = validate58;
const schema53 = {"type":"object","required":["clipId","atFrame"],"additionalProperties":false,"properties":{"clipId":{"type":"string"},"atFrame":{"type":"integer","minimum":0}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate58(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate58.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.clipId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "clipId"},message:"must have required property '"+"clipId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.atFrame === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "atFrame"},message:"must have required property '"+"atFrame"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "clipId") || (key0 === "atFrame"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.clipId !== undefined){
if(typeof data.clipId !== "string"){
const err3 = {instancePath:instancePath+"/clipId",schemaPath:"#/properties/clipId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.atFrame !== undefined){
let data1 = data.atFrame;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err4 = {instancePath:instancePath+"/atFrame",schemaPath:"#/properties/atFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/atFrame",schemaPath:"#/properties/atFrame/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
validate58.errors = vErrors;
return errors === 0;
}
validate58.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_clip_trim = validate59;
const schema54 = {"type":"object","required":["clipId"],"additionalProperties":false,"properties":{"clipId":{"type":"string"},"inFrame":{"type":"integer"},"outFrame":{"type":"integer"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate59(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate59.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.clipId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "clipId"},message:"must have required property '"+"clipId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(((key0 === "clipId") || (key0 === "inFrame")) || (key0 === "outFrame"))){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.clipId !== undefined){
if(typeof data.clipId !== "string"){
const err2 = {instancePath:instancePath+"/clipId",schemaPath:"#/properties/clipId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.inFrame !== undefined){
let data1 = data.inFrame;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err3 = {instancePath:instancePath+"/inFrame",schemaPath:"#/properties/inFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.outFrame !== undefined){
let data2 = data.outFrame;
if(!((typeof data2 == "number") && (!(data2 % 1) && !isNaN(data2)))){
const err4 = {instancePath:instancePath+"/outFrame",schemaPath:"#/properties/outFrame/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
else {
const err5 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
validate59.errors = vErrors;
return errors === 0;
}
validate59.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_clip_move = validate60;
const schema55 = {"type":"object","required":["clipId","toIndex"],"additionalProperties":false,"properties":{"clipId":{"type":"string"},"toIndex":{"type":"integer","minimum":0}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate60(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate60.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.clipId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "clipId"},message:"must have required property '"+"clipId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.toIndex === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "toIndex"},message:"must have required property '"+"toIndex"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "clipId") || (key0 === "toIndex"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.clipId !== undefined){
if(typeof data.clipId !== "string"){
const err3 = {instancePath:instancePath+"/clipId",schemaPath:"#/properties/clipId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.toIndex !== undefined){
let data1 = data.toIndex;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err4 = {instancePath:instancePath+"/toIndex",schemaPath:"#/properties/toIndex/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
if(typeof data1 == "number"){
if(data1 < 0 || isNaN(data1)){
const err5 = {instancePath:instancePath+"/toIndex",schemaPath:"#/properties/toIndex/minimum",keyword:"minimum",params:{comparison: ">=", limit: 0},message:"must be >= 0"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
validate60.errors = vErrors;
return errors === 0;
}
validate60.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_clip_delete = validate61;
const schema56 = {"type":"object","required":["clipId"],"additionalProperties":false,"properties":{"clipId":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate61(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate61.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.clipId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "clipId"},message:"must have required property '"+"clipId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "clipId")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.clipId !== undefined){
if(typeof data.clipId !== "string"){
const err2 = {instancePath:instancePath+"/clipId",schemaPath:"#/properties/clipId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate61.errors = vErrors;
return errors === 0;
}
validate61.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_captions_toggle = validate62;
const schema57 = {"type":"object","required":["enabled"],"additionalProperties":false,"properties":{"enabled":{"type":"boolean"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate62(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate62.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.enabled === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "enabled"},message:"must have required property '"+"enabled"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "enabled")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.enabled !== undefined){
if(typeof data.enabled !== "boolean"){
const err2 = {instancePath:instancePath+"/enabled",schemaPath:"#/properties/enabled/type",keyword:"type",params:{type: "boolean"},message:"must be boolean"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate62.errors = vErrors;
return errors === 0;
}
validate62.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_transcript_fixWord = validate63;
const schema58 = {"type":"object","required":["wordId","text"],"additionalProperties":false,"properties":{"wordId":{"type":"string"},"text":{"type":"string","minLength":1}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate63(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate63.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.wordId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "wordId"},message:"must have required property '"+"wordId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.text === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "text"},message:"must have required property '"+"text"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "wordId") || (key0 === "text"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.wordId !== undefined){
if(typeof data.wordId !== "string"){
const err3 = {instancePath:instancePath+"/wordId",schemaPath:"#/properties/wordId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.text !== undefined){
let data1 = data.text;
if(typeof data1 === "string"){
if(func4(data1) < 1){
const err4 = {instancePath:instancePath+"/text",schemaPath:"#/properties/text/minLength",keyword:"minLength",params:{limit: 1},message:"must NOT have fewer than 1 characters"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
else {
const err5 = {instancePath:instancePath+"/text",schemaPath:"#/properties/text/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
}
else {
const err6 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
validate63.errors = vErrors;
return errors === 0;
}
validate63.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_style_setField = validate64;
const schema59 = {"type":"object","required":["path","value"],"additionalProperties":false,"properties":{"path":{"type":"string","pattern":"^(cut|captions)\\.[a-zA-Z]+$"},"value":{},"mode":{"enum":["mandatory","preference"]},"reason":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};
const pattern4 = new RegExp("^(cut|captions)\\.[a-zA-Z]+$", "u");

function validate64(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate64.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.path === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "path"},message:"must have required property '"+"path"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.value === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "value"},message:"must have required property '"+"value"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((((key0 === "path") || (key0 === "value")) || (key0 === "mode")) || (key0 === "reason"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.path !== undefined){
let data0 = data.path;
if(typeof data0 === "string"){
if(!pattern4.test(data0)){
const err3 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/pattern",keyword:"pattern",params:{pattern: "^(cut|captions)\\.[a-zA-Z]+$"},message:"must match pattern \""+"^(cut|captions)\\.[a-zA-Z]+$"+"\""};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
else {
const err4 = {instancePath:instancePath+"/path",schemaPath:"#/properties/path/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
if(data.mode !== undefined){
let data1 = data.mode;
if(!((data1 === "mandatory") || (data1 === "preference"))){
const err5 = {instancePath:instancePath+"/mode",schemaPath:"#/properties/mode/enum",keyword:"enum",params:{allowedValues: schema59.properties.mode.enum},message:"must be equal to one of the allowed values"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
}
if(data.reason !== undefined){
if(typeof data.reason !== "string"){
const err6 = {instancePath:instancePath+"/reason",schemaPath:"#/properties/reason/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err6];
}
else {
vErrors.push(err6);
}
errors++;
}
}
}
else {
const err7 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err7];
}
else {
vErrors.push(err7);
}
errors++;
}
validate64.errors = vErrors;
return errors === 0;
}
validate64.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_style_updateProposal_accept = validate65;
const schema60 = {"type":"object","required":["proposalId"],"additionalProperties":false,"properties":{"proposalId":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate65(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate65.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.proposalId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposalId"},message:"must have required property '"+"proposalId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "proposalId")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err2 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate65.errors = vErrors;
return errors === 0;
}
validate65.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_style_updateProposal_reject = validate66;
const schema61 = {"type":"object","required":["proposalId"],"additionalProperties":false,"properties":{"proposalId":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate66(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate66.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.proposalId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "proposalId"},message:"must have required property '"+"proposalId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "proposalId")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.proposalId !== undefined){
if(typeof data.proposalId !== "string"){
const err2 = {instancePath:instancePath+"/proposalId",schemaPath:"#/properties/proposalId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate66.errors = vErrors;
return errors === 0;
}
validate66.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_project_upgradeStyle = validate67;
const schema62 = {"type":"object","required":["toVersion"],"additionalProperties":false,"properties":{"toVersion":{"type":"integer","minimum":1}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate67(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate67.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.toVersion === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "toVersion"},message:"must have required property '"+"toVersion"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "toVersion")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.toVersion !== undefined){
let data0 = data.toVersion;
if(!((typeof data0 == "number") && (!(data0 % 1) && !isNaN(data0)))){
const err2 = {instancePath:instancePath+"/toVersion",schemaPath:"#/properties/toVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
if(typeof data0 == "number"){
if(data0 < 1 || isNaN(data0)){
const err3 = {instancePath:instancePath+"/toVersion",schemaPath:"#/properties/toVersion/minimum",keyword:"minimum",params:{comparison: ">=", limit: 1},message:"must be >= 1"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
}
}
else {
const err4 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
validate67.errors = vErrors;
return errors === 0;
}
validate67.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_style_rollback = validate68;
const schema63 = {"type":"object","required":["styleId","toVersion"],"additionalProperties":false,"properties":{"styleId":{"type":"string"},"toVersion":{"type":"integer"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate68(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate68.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.styleId === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "styleId"},message:"must have required property '"+"styleId"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
if(data.toVersion === undefined){
const err1 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "toVersion"},message:"must have required property '"+"toVersion"+"'"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
for(const key0 in data){
if(!((key0 === "styleId") || (key0 === "toVersion"))){
const err2 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
if(data.styleId !== undefined){
if(typeof data.styleId !== "string"){
const err3 = {instancePath:instancePath+"/styleId",schemaPath:"#/properties/styleId/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
}
if(data.toVersion !== undefined){
let data1 = data.toVersion;
if(!((typeof data1 == "number") && (!(data1 % 1) && !isNaN(data1)))){
const err4 = {instancePath:instancePath+"/toVersion",schemaPath:"#/properties/toVersion/type",keyword:"type",params:{type: "integer"},message:"must be integer"};
if(vErrors === null){
vErrors = [err4];
}
else {
vErrors.push(err4);
}
errors++;
}
}
}
else {
const err5 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err5];
}
else {
vErrors.push(err5);
}
errors++;
}
validate68.errors = vErrors;
return errors === 0;
}
validate68.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_history_undo = validate69;
const schema64 = {"type":"object","additionalProperties":false,"properties":{},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate69(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate69.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
validate69.errors = vErrors;
return errors === 0;
}
validate69.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_history_redo = validate70;
const schema65 = {"type":"object","additionalProperties":false,"properties":{},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate70(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate70.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
for(const key0 in data){
const err0 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
}
else {
const err1 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
validate70.errors = vErrors;
return errors === 0;
}
validate70.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};

export const cmd_export_mp4 = validate71;
const schema66 = {"type":"object","required":["outputPath"],"additionalProperties":false,"properties":{"outputPath":{"type":"string"}},"$defs":{"styleRef":{"type":"object","required":["styleId","version"],"properties":{"styleId":{"type":"string"},"version":{"type":"integer"}}},"command":{"type":"object","required":["name","undoable","confirm","actors","params"],"additionalProperties":true,"properties":{"name":{"type":"string","pattern":"^[a-z]+(\\.[a-zA-Z]+)+$"},"description":{"type":"string"},"undoable":{"type":"boolean","description":"true = تؤخذ لقطة كاملة من المشروع قبل التنفيذ"},"confirm":{"type":"boolean","description":"true = تأكيد منفصل (الدستور III: تصدير، إرسال خارجي، تطبيق مقترح، تغيير نمط)"},"actors":{"type":"array","items":{"enum":["user","agent"]}},"params":{"type":"object"},"result":{"type":"object"},"errors":{"type":"array","items":{"type":"string"}},"warnings":{"type":"array","items":{"type":"string"}}}}}};

function validate71(data, {instancePath="", parentData, parentDataProperty, rootData=data, dynamicAnchors={}}={}){
let vErrors = null;
let errors = 0;
const evaluated0 = validate71.evaluated;
if(evaluated0.dynamicProps){
evaluated0.props = undefined;
}
if(evaluated0.dynamicItems){
evaluated0.items = undefined;
}
if(data && typeof data == "object" && !Array.isArray(data)){
if(data.outputPath === undefined){
const err0 = {instancePath,schemaPath:"#/required",keyword:"required",params:{missingProperty: "outputPath"},message:"must have required property '"+"outputPath"+"'"};
if(vErrors === null){
vErrors = [err0];
}
else {
vErrors.push(err0);
}
errors++;
}
for(const key0 in data){
if(!(key0 === "outputPath")){
const err1 = {instancePath,schemaPath:"#/additionalProperties",keyword:"additionalProperties",params:{additionalProperty: key0},message:"must NOT have additional properties"};
if(vErrors === null){
vErrors = [err1];
}
else {
vErrors.push(err1);
}
errors++;
}
}
if(data.outputPath !== undefined){
if(typeof data.outputPath !== "string"){
const err2 = {instancePath:instancePath+"/outputPath",schemaPath:"#/properties/outputPath/type",keyword:"type",params:{type: "string"},message:"must be string"};
if(vErrors === null){
vErrors = [err2];
}
else {
vErrors.push(err2);
}
errors++;
}
}
}
else {
const err3 = {instancePath,schemaPath:"#/type",keyword:"type",params:{type: "object"},message:"must be object"};
if(vErrors === null){
vErrors = [err3];
}
else {
vErrors.push(err3);
}
errors++;
}
validate71.errors = vErrors;
return errors === 0;
}
validate71.evaluated = {"props":true,"dynamicProps":false,"dynamicItems":false};
