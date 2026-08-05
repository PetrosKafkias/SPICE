import svgPaths from "./svg-u9cjz3qpph";

function BoxiconsLock() {
  return (
    <div className="aspect-[42/42] bg-[rgba(246,139,44,0.2)] relative rounded-[30px] self-stretch shrink-0" data-name="boxicons:lock">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center px-[9px] py-[4px] relative size-full">
          <div className="h-[30px] relative shrink-0 w-[24px]" data-name="Vector">
            <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 30">
              <path d={svgPaths.p37f1b700} fill="var(--fill-0, #CA7428)" id="Vector" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Frame4() {
  return (
    <div className="[word-break:break-word] content-stretch flex flex-col gap-[8px] items-start justify-center leading-[normal] relative shrink-0 whitespace-nowrap">
      <p className="font-['Montserrat:SemiBold',sans-serif] font-semibold relative shrink-0 text-[#444] text-[22px]">{`Privacy & Cookies Policy`}</p>
      <p className="font-['Montserrat:Medium',sans-serif] font-medium relative shrink-0 text-[#ca7428] text-[16px]">{`TRUST & TRANSPARENCY`}</p>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0">
      <BoxiconsLock />
      <Frame4 />
    </div>
  );
}

function Frame5() {
  return (
    <div className="content-stretch flex flex-col gap-[24px] items-start justify-center relative shrink-0 w-full">
      <Frame6 />
      <p className="[word-break:break-word] font-['Montserrat:Medium',sans-serif] font-medium leading-[0] min-w-full relative shrink-0 text-[#444] text-[0px] w-[min-content]">
        <span className="leading-[normal] text-[18px]">{`The SPICE platform uses essential cookies to ensure a secure and functional experience for all citizens. We also use optional analytics to improve our co-creation tools. Your data choice respects the `}</span>
        <span className="[text-underline-position:from-font] decoration-from-font decoration-solid leading-[normal] text-[#ca7428] text-[18px] underline">Privacy Policy</span>
        <span className="leading-[normal] text-[18px]">{` and `}</span>
        <span className="[text-underline-position:from-font] decoration-from-font decoration-solid leading-[normal] text-[#ca7428] text-[18px] underline">Cookies Policy</span>
        <span className="leading-[normal] text-[18px]">.</span>
      </p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#444] text-[20px] whitespace-nowrap">Preferences</p>
        </div>
      </div>
      <div aria-hidden className="absolute border-2 border-black border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-white flex-[1_0_0] min-w-px relative">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[#ca7428] text-[20px] whitespace-nowrap">{`Reject Non-Essential `}</p>
        </div>
      </div>
      <div aria-hidden className="absolute border-2 border-[#ca7428] border-solid inset-0 pointer-events-none" />
    </div>
  );
}

function Frame3() {
  return (
    <div className="bg-[#f68b2c] flex-[1_0_0] min-w-px relative">
      <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex items-center justify-center px-[24px] py-[16px] relative size-full">
          <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[20px] text-white whitespace-nowrap">Accept All</p>
        </div>
      </div>
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[16px] items-start relative shrink-0 w-[818px]">
      <Frame1 />
      <Frame />
      <Frame3 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="content-stretch flex flex-[1_0_0] flex-col gap-[32px] items-start min-w-px relative">
      <Frame5 />
      <Frame2 />
    </div>
  );
}

function MaterialSymbolsCloseRounded() {
  return (
    <div className="relative shrink-0 size-[35px]" data-name="material-symbols:close-rounded">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 35 35">
        <g id="material-symbols:close-rounded">
          <path d={svgPaths.p16fc8900} fill="var(--fill-0, #444444)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

export default function PrivacyCookiesPolicy() {
  return (
    <div className="bg-white content-stretch flex gap-[16px] items-start justify-end p-[32px] relative size-full" data-name="Privacy & Cookies Policy">
      <Frame7 />
      <MaterialSymbolsCloseRounded />
    </div>
  );
}