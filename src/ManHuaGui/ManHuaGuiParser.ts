import {
    Chapter,
    ChapterDetails,
    PartialSourceManga,
    SourceManga,
    Tag,
    TagSection
} from '@paperback/types'

import { decodeHTML } from 'entities'

import { CheerioAPI } from 'cheerio/lib/load'

import * as OpenCC from 'opencc-js';

export const parseMangaDetails = ($: CheerioAPI, mangaId: string): SourceManga => {
    const title  = $('.book-title h1').text() ?? ''

    const strImg    = $('.book-cover img').attr('src') ?? ''
    const image  = `https:${strImg}`

    const desc   = $('#intro-cut').text().trim() ?? ''
    const rating = Number($('.score-avg em').text() ?? '0')

    const status = $('.status .red').text() ?? ''

    const spanElements = $('.detail-list li span').toArray()
    const authorSpan = spanElements.at(4)
    const authorItems = $('a', authorSpan).toArray().map((x) => $(x)?.text())

    const author = authorItems.at(0) ?? ''
    const artist = authorItems.at(1) ?? author ?? ''

    // const author = $('.status .red').text() ?? '' // TODO: do author

    // let   status = '', author = '', artist = ''



    // for (const obj of $('.left-side .imptdt').toArray()) {
    //     const item = $('i' , obj).text().trim()
    //     const type = $('h1', obj).text().trim()
    //     if      (type.toLowerCase().includes('status')) status = item
    //     else if (type.toLowerCase().includes('author')) author = item
    //     else if (type.toLowerCase().includes('artist')) artist = item
    // }

    const arrayTags: Tag[] = []

    const tagItems = spanElements.at(3)
    for (const obj of $('a', tagItems).toArray()) {

        const id    = $(obj).attr('href')?.replace('/list/', '') ?? ''
        const label = $(obj).text().trim()
        if (!id || !label) continue
        arrayTags.push({ id: id, label: label })
    }
    const tags: TagSection[] = [App.createTagSection({ id: 'genre', label: '劇情', tags: arrayTags.map((x) => App.createTag(x)) })]

    return App.createSourceManga({
        id: mangaId,
        mangaInfo: App.createMangaInfo({
            titles: [decodeHTML(title)],
            image,
            rating: Number(rating) ?? 0,
            status,
            artist,
            author,
            tags,
            desc: decodeHTML(desc)
        })
    })
}

export const parseChapters = ($: CheerioAPI, showNSFW: Boolean, skipExtra: Boolean): Chapter[] => {
    const chapters: Chapter[] = []


    const hiddenEncryptedChapterList = $('#__VIEWSTATE')
    if (hiddenEncryptedChapterList && showNSFW){
        const decodedHiddenChapterList = String(eval(jsDecodeFunc + `LZString.decompressFromBase64('${hiddenEncryptedChapterList.attr("value")}');`))
        $('#__VIEWSTATE').remove()
        $('#erroraudit_show').replaceWith(decodedHiddenChapterList)
    }




    const arrChapters = $('.chapter-list').toArray() // TODO: the order to be fixed

    const arrLabels = $('h4 span').toArray()

    const converter = OpenCC.Converter({ from: 'cn', to: 'hk' });


    for (const [index, chapterList] of arrChapters.entries()){
        const arrButtons = $('li', chapterList).toArray()
        const label = converter($(arrLabels.at(index))?.text() ?? String(index))

        if ( (! label.includes("單行本") && (! label.includes("單話"))) && skipExtra) continue

        for (const item of arrButtons) {

            const id = $('a', item).attr('href')?.match(/(\d+).html/)?.at(1) ?? ''
    
            // const time = convertTime($('.chapterdate', item).text().trim())
    
            let name = converter($('a', item).attr('title') ?? '')
                    
            const chapNumRegex = name.match(/\d+/g)?.at(0) ?? '0'
            const chapNum = Number(chapNumRegex)

            if (label.includes("單話")){
                name = name.substring(name.indexOf("話")+1)
                name = name.substring(name.indexOf("回")+1)
                if (name.indexOf(chapNumRegex) != -1)
                    name = name.substring(name.indexOf(chapNumRegex) + chapNumRegex.length)
            }
            if (label.includes('單行本'))  name = name.substring(name.indexOf("卷")+1)

            name = name.trim()

            if (name == "試看版") name = ''
    
    
            chapters.push(
                App.createChapter({
                    id,
                    name,
                    chapNum: label.includes('單行本') ? 1 : chapNum,
                    volume: label.includes('單行本') ? chapNum : undefined,
                    group: label,
                    // time,
                    langCode: '🇭🇰'
                })
            )
        }
    }
    return chapters
}

const jsDecodeFunc = 
    `
    var LZString=(function(){var f=String.fromCharCode;var keyStrBase64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";var baseReverseDic={};function getBaseValue(alphabet,character){if(!baseReverseDic[alphabet]){baseReverseDic[alphabet]={};for(var i=0;i<alphabet.length;i++){baseReverseDic[alphabet][alphabet.charAt(i)]=i}}return baseReverseDic[alphabet][character]}var LZString={decompressFromBase64:function(input){if(input==null)return"";if(input=="")return null;return LZString._0(input.length,32,function(index){return getBaseValue(keyStrBase64,input.charAt(index))})},_0:function(length,resetValue,getNextValue){var dictionary=[],next,enlargeIn=4,dictSize=4,numBits=3,entry="",result=[],i,w,bits,resb,maxpower,power,c,data={val:getNextValue(0),position:resetValue,index:1};for(i=0;i<3;i+=1){dictionary[i]=i}bits=0;maxpower=Math.pow(2,2);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}switch(next=bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}c=f(bits);break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}c=f(bits);break;case 2:return""}dictionary[3]=c;w=c;result.push(c);while(true){if(data.index>length){return""}bits=0;maxpower=Math.pow(2,numBits);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}switch(c=bits){case 0:bits=0;maxpower=Math.pow(2,8);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 1:bits=0;maxpower=Math.pow(2,16);power=1;while(power!=maxpower){resb=data.val&data.position;data.position>>=1;if(data.position==0){data.position=resetValue;data.val=getNextValue(data.index++)}bits|=(resb>0?1:0)*power;power<<=1}dictionary[dictSize++]=f(bits);c=dictSize-1;enlargeIn--;break;case 2:return result.join('')}if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++}if(dictionary[c]){entry=dictionary[c]}else{if(c===dictSize){entry=w+w.charAt(0)}else{return null}}result.push(entry);dictionary[dictSize++]=w+entry.charAt(0);enlargeIn--;w=entry;if(enlargeIn==0){enlargeIn=Math.pow(2,numBits);numBits++}}}};return LZString})();String.prototype.splic=function(f){return LZString.decompressFromBase64(this).split(f)};
    `

export const parseChapterDetails = ($: CheerioAPI, mangaId: string, id: string): ChapterDetails => {

    // pages.push("https://i.hamreus.com/ps3/x/xf-20170/cxhxftdjnmh/%E7%AC%AC127%E8%AF%9D/20230623_%E5%A4%8D%E6%B4%BB%21%E5%A4%8D%E6%B4%BB%21%21.jpg.webp?e=1700913795&m=hIp7XPi1vDyxEldU8JhHOA")

    const bodyHTML = $("body").html()
    const imgCode = bodyHTML?.match(/window\[".*?"\](\(.*\)\s*\{[\s\S]+\}\s*\(.*\))\s*<\/script>/)?.at(1) ?? ''
    const imgDecode = String(eval(jsDecodeFunc + imgCode))

    const imgJsonStr = imgDecode.match(/\{.*\}/g)?.at(0) ?? ''
    const imgJson = JSON.parse(imgJsonStr)

    const pages: string[] = imgJson.files.map((x:string) =>
        encodeURI(decodeURI(decodeHTML(
            `https://i.hamreus.com${imgJson.path}${x}?e=${imgJson.sl?.e}&m=${imgJson.sl?.m}`
            ))))


    // const chapterList = $('#tbBox img').toArray()
    // for (const obj of chapterList) {
    //     const imageUrl = $(obj).attr('src') ?? $(obj).attr('data-src')
    //     if (!imageUrl) continue
    //     pages.push(imageUrl.trim())
    // }

    return App.createChapterDetails({
        id,
        mangaId,
        pages
    })
}

export const parseSearchResults = ($: CheerioAPI): PartialSourceManga[] => {
    const results: PartialSourceManga[] = []

    for (const item of $('.book-result li.cf').toArray()) {
        const mangaId    = $('a.bcover', item).attr('href')?.match(/\d+/g)?.at(0) ?? ''
        const title = $('a.bcover', item).attr('title') ?? ''
        const strImg    = $('img', item).attr('src') ?? $('img', item).attr('data-src') ?? ''
        const image     = `https:${strImg}`
        results.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    return results
}

export const parseViewMore = ($: CheerioAPI): PartialSourceManga[] => {

    const more: PartialSourceManga[] = []
    for (const item of $('.book-list li').toArray()) {
        const mangaId   = $('a.bcover', item).attr('href')?.match(/\d+/g)?.at(0) ?? ''
        const title     = $('a.bcover', item).attr('title') ?? ''
        const strImg    = $('img', item).attr('src') ?? $('img', item).attr('data-src') ?? ''
        const image     = `https:${strImg}`
        more.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    return more
}

export const parseHomeSections = ($: CheerioAPI): PartialSourceManga[] => {
    // const section1 = App.createHomeSection({ id: '1', title: '最新更新', type: HomeSectionType.singleRowNormal, containsMoreItems: true})
    // const section2 = App.createHomeSection({ id: '2', title: 'Latest', type: HomeSectionType.singleRowNormal, containsMoreItems: true})
    // const section3 = App.createHomeSection({ id: '3', title: 'Popular Titles', type: HomeSectionType.singleRowNormal, containsMoreItems: true})

    const items: PartialSourceManga[] = []
    // const popular : PartialSourceManga[] = []
    // const latest  : PartialSourceManga[] = []

    const arrObjects = $('.book-list li').toArray()
    // const arrPopular  = $('.pop-list-desktop .bsx').toArray()
    // const arrLatest   = $('.latest-updates .bsx').toArray()

    for (const obj of arrObjects) {
        const mangaId   = $('a.bcover', obj).attr('href')?.match(/\d+/g)?.at(0) ?? ''
        const title     = $('a.bcover', obj).attr('title') ?? ''
        const strImg    = $('img', obj).attr('src') ?? $('img', obj).attr('data-src') ?? ''
        const image     = `https:${strImg}`
        items.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )
    }
    return items
}

export const parseFeatured = ($: CheerioAPI): PartialSourceManga[] => {
    const items: PartialSourceManga[] = []

    const arrElements = $('table.rank-detail tr .rank-title').toArray()

    for (const element of arrElements) {
        const mangaId = $('a', element).attr('href')?.match(/\d+/g)?.at(0) ?? ''
        const title = $('a', element)?.text() ?? ''
        const image = `https://cf.mhgui.com/cpic/h/${mangaId}.jpg`
        items.push(
            App.createPartialSourceManga({
                mangaId,
                image,
                title: decodeHTML(title)
            })
        )

    }

    return items
}

/**
     * Parses a time string from a Madara source into a Date object.
     * Copied from Madara.ts made by gamefuzzy
     */
// const convertTime = (timeAgo: string): Date => {
//     let time: Date
//     let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0])
//     trimmed = trimmed == 0 && timeAgo.includes('a') ? 1 : trimmed
//     if (timeAgo.includes('mins') || timeAgo.includes('minutes') || timeAgo.includes('minute')) {
//         time = new Date(Date.now() - trimmed * 60000)
//     } else if (timeAgo.includes('hours') || timeAgo.includes('hour')) {
//         time = new Date(Date.now() - trimmed * 3600000)
//     } else if (timeAgo.includes('days') || timeAgo.includes('day')) {
//         time = new Date(Date.now() - trimmed * 86400000)
//     } else if (timeAgo.includes('year') || timeAgo.includes('years')) {
//         time = new Date(Date.now() - trimmed * 31556952000)
//     } else {
//         time = new Date(timeAgo)
//     }

//     return time
// }
