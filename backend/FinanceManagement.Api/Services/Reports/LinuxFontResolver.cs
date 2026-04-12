using PdfSharp.Fonts;

namespace FinanceManagement.Api.Services.Reports;

/// <summary>
/// Custom font resolver for PdfSharp running on Linux (Cloud Run).
/// PdfSharp 6.x cannot discover system fonts on Linux without a resolver.
///
/// We install fonts-liberation in the Docker image (Liberation Sans is
/// metric-compatible with Arial) and this resolver maps font requests
/// to the TTF files on disk.
/// </summary>
public class LinuxFontResolver : IFontResolver
{
    // Liberation Sans is metric-compatible with Arial and ships in
    // the fonts-liberation package on Debian/Ubuntu.
    private static readonly Dictionary<string, string> FontFiles = new(StringComparer.OrdinalIgnoreCase)
    {
        // Regular
        ["Liberation Sans|0"]         = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ["Liberation Sans|1"]         = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ["Liberation Sans|2"]         = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
        ["Liberation Sans|3"]         = "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
        ["Arial|0"]                   = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ["Arial|1"]                   = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ["Arial|2"]                   = "/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf",
        ["Arial|3"]                   = "/usr/share/fonts/truetype/liberation/LiberationSans-BoldItalic.ttf",
        // Fallback for any other family → Liberation Sans Regular
    };

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        // Build a style index: 0=regular, 1=bold, 2=italic, 3=bold+italic
        var style = (isBold ? 1 : 0) | (isItalic ? 2 : 0);
        var key = $"{familyName}|{style}";

        if (FontFiles.ContainsKey(key))
            return new FontResolverInfo(key);

        // Fall back: try Arial mapping (covers any family name)
        var fallbackKey = $"Arial|{style}";
        return new FontResolverInfo(fallbackKey);
    }

    public byte[]? GetFont(string faceName)
    {
        if (FontFiles.TryGetValue(faceName, out var path) && File.Exists(path))
            return File.ReadAllBytes(path);

        // Last resort: try all Liberation Sans paths
        foreach (var filePath in FontFiles.Values.Distinct())
        {
            if (File.Exists(filePath))
                return File.ReadAllBytes(filePath);
        }

        return null;
    }
}
