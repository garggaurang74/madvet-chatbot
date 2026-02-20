// lib/queryExpander.ts
// LLM-powered query expansion — no hardcoded maps, works for any language/spelling
// Called once per user message before product search

import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Cache expansions for identical queries within the same process (memory only)
const expansionCache = new Map<string, ExpandedQuery>()

export interface ExpandedQuery {
  clinicalTerms: string[]   // English veterinary terms
  species:       string[]   // detected animal species
  formFactor:    string[]   // injection, bolus, spray, etc.
  isFollowUp:    boolean
  isEmergency:   boolean
}

export async function expandQuery(userMessage: string): Promise<ExpandedQuery> {
  const lower = userMessage.toLowerCase().trim()

  // Return cached result if available
  if (expansionCache.has(lower)) return expansionCache.get(lower)!

  try {
    const response = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0,
      max_tokens:  200,
      messages: [
        {
          role: 'system',
          content: `You are a veterinary query parser. Given a farmer's message in any language (Hindi, Hinglish, English, or mixed), extract structured veterinary search terms.

Respond ONLY with valid JSON:
{
  "clinicalTerms": ["array of English veterinary/clinical terms that match this condition"],
  "species": ["detected animal species in English, e.g. cattle, buffalo, goat, sheep, poultry, dog"],
  "formFactor": ["injection, bolus, spray, powder, liquid, soap — if mentioned"],
  "isFollowUp": false,
  "isEmergency": false
}

Examples:
"gaay mein keede" → clinicalTerms: ["anthelmintic","deworming","internal parasites","roundworm","tapeworm"], species: ["cattle"]
"ghao ke liye spray" → clinicalTerms: ["wound","wound healing","topical","antiseptic","wound care"], formFactor: ["spray"]
"dudh badhana" → clinicalTerms: ["milk production","galactagogue","milk yield","lactation"]
"tikks" → clinicalTerms: ["tick","ectoparasite","external parasite","permethrin"]
"theek hai" → isFollowUp: true
"pet phula" → clinicalTerms: ["bloat","tympany"], isEmergency: true`
        },
        { role: 'user', content: userMessage }
      ],
    })

    const text   = response.choices[0]?.message?.content?.trim() ?? ''
    const clean  = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean) as ExpandedQuery

    expansionCache.set(lower, parsed)
    return parsed
  } catch (err) {
    console.error('[QueryExpander] Failed, using fallback:', err)
    // Fallback — return empty expansion, search still works via Fuse.js
    return {
      clinicalTerms: [],
      species:       [],
      formFactor:    [],
      isFollowUp:    false,
      isEmergency:   false,
    }
  }
}
