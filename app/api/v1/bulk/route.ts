import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, requests } = body;

    if (!requests || !Array.isArray(requests)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected { model, requests: array }' },
        { status: 400 }
      );
    }

    // For now, return mock responses since we don't have AI SDK configured
    // This allows the bulk update script to work in development mode
    const responses = requests.map((req: { id: string; messages: any[] }) => {
      const userMessage = req.messages.find(m => m.role === 'user')?.content || '';
      const topicMatch = userMessage.match(/TOPIC_PROMPT: (.+?)(?:\n|$)/);
      const topic = topicMatch ? topicMatch[1] : 'Unknown Topic';
      
      return {
        id: req.id,
        output: JSON.stringify({
          title: `${topic} — State of the Art Update`,
          summary: `Latest developments in ${topic.toLowerCase()} with key insights for strategic decision-making.`,
          markdown: `## Signal Radar\n- Recent breakthrough in ${topic.toLowerCase()}\n- Market indicators showing significant movement\n\n## Investment & Funding Flow\n- New funding rounds in the space\n- Strategic partnerships announced\n\n## Regulatory & Policy Watch\n- Policy updates affecting the sector\n- Compliance considerations for stakeholders\n\n## Frontier Experiments\n- Cutting-edge research initiatives\n- Experimental approaches gaining traction\n\n## Action Playbook\n- Immediate steps for stakeholders\n- Strategic recommendations for the coming quarter`,
          sources: [
            'https://example.com/source1',
            'https://example.com/source2',
            'https://example.com/source3'
          ]
        })
      };
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('Bulk API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
