const fs = require('fs');

let code = fs.readFileSync('app/[locale]/assistant/assistant-client.tsx', 'utf8');

// 1. Update main container height to full height minus navbar
code = code.replace(/flex h-\[calc\(100vh-4rem\)\] flex-col bg-slate-50/g, 'flex min-h-screen flex-col bg-slate-50 pt-24 pb-32');

// 2. Remove the Top Banner (Mode Switcher) to make it cleaner
const bannerStart = '{/* Top Banner / Mode Switcher */}';
const bannerEnd = '</div>\n      </div>';
let bannerStartIndex = code.indexOf(bannerStart);
let bannerEndIndex = code.indexOf(bannerEnd, bannerStartIndex);

if (bannerStartIndex !== -1 && bannerEndIndex !== -1) {
    code = code.replace(code.substring(bannerStartIndex, bannerEndIndex + bannerEnd.length), '');
}

// 3. Make messages area flex-1 and clean up paddings
code = code.replace(/<div className="flex-1 overflow-y-auto pb-8 pt-8">/g, '<div className="flex-1">');

// 4. Update the Fixed Input Area to be truly fixed at the bottom center
const inputAreaStart = '{/* Fixed Input Area */}';
const inputAreaEnd = '</div>\n          </div>';
let inputStartIndex = code.indexOf(inputAreaStart);
let inputEndIndex = code.indexOf(inputAreaEnd, inputStartIndex);

if (inputStartIndex !== -1 && inputEndIndex !== -1) {
    const newInputArea = `
          {/* Fixed Input Area */}
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-10">
            <div className="mx-auto">
              {messages.length === 1 && (
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      disabled={sending}
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-md transition-all hover:border-indigo-300 hover:bg-white hover:text-indigo-600 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-slate-300"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
              
              <form onSubmit={onSubmit} className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition duration-1000 group-focus-within:duration-200"></div>
                <div className="relative flex items-center gap-2">
                  <Input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={
                      tx(
                        "询问任何关于签证的问题...",
                        "Vizeler hakkında herhangi bir şey sorun...",
                        "Ask anything about visas..."
                      )
                    }
                    className="h-12 w-full rounded-xl border-gray-200 bg-white/90 pl-5 pr-12 text-sm shadow-xl backdrop-blur-xl transition-all focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                  <Button 
                    type="submit" 
                    size="icon"
                    disabled={sending || !input.trim()}
                    className="absolute right-1.5 h-9 w-9 rounded-lg bg-zinc-900 text-white shadow-md transition-all hover:bg-black disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>`;
    code = code.replace(code.substring(inputStartIndex, inputEndIndex + inputAreaEnd.length), newInputArea);
}

// 5. Cleanup message bubble styling to be more minimal
code = code.replace(/rounded-2xl px-5 py-4 shadow-sm/g, 'rounded-xl px-4 py-3 shadow-sm border border-slate-100');

fs.writeFileSync('app/[locale]/assistant/assistant-client.tsx', code);
console.log('Assistant layout updated');
